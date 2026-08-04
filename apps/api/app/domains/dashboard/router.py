from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from app.core.database import get_db
from app.domains.checkins.repository import RawCheckin, Prediction
from app.core.config import settings
from app.ml.registry import get_model_meta

router = APIRouter()


@router.get("/aggregate")
async def get_aggregate(db: AsyncSession = Depends(get_db)):
    """Avg stress per department (k-anonymity enforced - min group size)."""
    result = await db.execute(
        select(
            RawCheckin.dept_hash,
            func.avg(RawCheckin.stress_level).label("avg_stress"),
            func.avg(RawCheckin.valence).label("avg_valence"),
            func.count(RawCheckin.id).label("cnt"),
        )
        .group_by(RawCheckin.dept_hash)
        .having(func.count(RawCheckin.id) >= settings.K_ANONYMITY_THRESHOLD)
    )
    rows = result.all()
    return {
        "data": [
            {
                "dept_hash": r.dept_hash,
                "avg_stress": round(r.avg_stress, 2) if r.avg_stress is not None else None,
                "avg_valence": round(r.avg_valence, 3) if r.avg_valence is not None else None,
                "count": r.cnt,
            }
            for r in rows
        ]
    }


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Overall stats: total, avg stress, distribution, high-stress count, active depts."""
    total_res = await db.execute(select(func.count(RawCheckin.id)))
    total = total_res.scalar() or 0

    avg_res = await db.execute(select(func.avg(RawCheckin.stress_level)))
    avg_stress = avg_res.scalar()

    # checkins with stress > 7 considered high-stress
    high_res = await db.execute(
        select(func.count(RawCheckin.id)).where(RawCheckin.stress_level > 7)
    )
    high_stress_count = high_res.scalar() or 0

    dept_res = await db.execute(
        select(func.count(func.distinct(RawCheckin.dept_hash))).where(
            RawCheckin.dept_hash.isnot(None)
        )
    )
    active_departments = dept_res.scalar() or 0

    dist_res = await db.execute(
        select(RawCheckin.stress_level, func.count(RawCheckin.id).label("cnt"))
        .group_by(RawCheckin.stress_level)
        .order_by(RawCheckin.stress_level)
    )
    distribution = {row.stress_level: row.cnt for row in dist_res.all()}

    # avg valence across all submissions (-1 to 1)
    valence_res = await db.execute(select(func.avg(RawCheckin.valence)))
    avg_valence = valence_res.scalar()

    return {
        "total_checkins": total,
        "avg_stress": round(avg_stress, 2) if avg_stress is not None else None,
        "avg_valence": round(avg_valence, 3) if avg_valence is not None else None,
        "high_stress_count": high_stress_count,
        "active_departments": active_departments,
        "distribution": distribution,
    }


@router.get("/trend")
async def get_trend(db: AsyncSession = Depends(get_db), days: int = 7):
    """Avg stress per day for the last N days (default 7, max 30)."""
    days = min(days, 30)
    result = await db.execute(
        text(f"""
            SELECT DATE(created_at) AS day,
                   ROUND(AVG(stress_level)::numeric, 2) AS avg_stress,
                   ROUND(AVG(valence)::numeric, 3) AS avg_valence,
                   COUNT(*) AS cnt
            FROM raw_checkins
            WHERE created_at >= NOW() - INTERVAL '{days} days'
            GROUP BY day
            ORDER BY day
        """)
    )
    return {
        "data": [
            {
                "day": str(r.day),
                "avg_stress": float(r.avg_stress),
                "avg_valence": float(r.avg_valence) if r.avg_valence is not None else None,
                "count": r.cnt,
            }
            for r in result.all()
        ]
    }


@router.get("/predictions")
async def get_predictions_distribution(db: AsyncSession = Depends(get_db)):
    """Count + avg confidence of ML predictions per named category (Low/Medium/High)."""
    label_map = {"0": "Low", "1": "Medium", "2": "High"}
    result = await db.execute(
        select(
            Prediction.category,
            func.count(Prediction.id).label("cnt"),
            func.avg(Prediction.confidence).label("avg_confidence"),
        ).group_by(Prediction.category)
    )
    raw = {r.category: {"count": r.cnt, "avg_confidence": round(r.avg_confidence, 3) if r.avg_confidence else None}
           for r in result.all()}
    # map numeric labels to display names
    named_counts = {label_map.get(k, k): v["count"] for k, v in raw.items()}
    named_conf = {label_map.get(k, k): v["avg_confidence"] for k, v in raw.items()}
    return {"data": named_counts, "avg_confidence": named_conf}


@router.get("/course")
async def get_course_aggregate(db: AsyncSession = Depends(get_db)):
    """Avg stress per course hash (k-anonymity enforced)."""
    result = await db.execute(
        select(
            RawCheckin.course_hash,
            func.avg(RawCheckin.stress_level).label("avg_stress"),
            func.count(RawCheckin.id).label("cnt"),
        )
        .group_by(RawCheckin.course_hash)
        .having(func.count(RawCheckin.id) >= settings.K_ANONYMITY_THRESHOLD)
    )
    rows = result.all()
    return {
        "data": [
            {
                "course_hash": r.course_hash,
                "avg_stress": round(r.avg_stress, 2) if r.avg_stress is not None else None,
                "count": r.cnt,
            }
            for r in rows
        ]
    }


@router.get("/ml-health")
async def ml_health():
    """Return current ML model status: which model is active, how old the cache is."""
    meta = get_model_meta()
    return {
        "model_source": meta["source"],  # "mlflow" or "baseline"
        "cache_age_seconds": meta["age_seconds"],
        "is_production_model": meta["source"] == "mlflow",
    }


@router.get("/insights")
async def get_insights(db: AsyncSession = Depends(get_db)):
    """Return high-level AI-ready signals for the dashboard insights panel.

    All aggregated — no individual records exposed.
    """
    # top mood tags across all check-ins
    tag_rows = await db.execute(
        text("SELECT tags FROM raw_checkins WHERE tags IS NOT NULL LIMIT 1000")
    )
    import json
    from collections import Counter

    tag_counter: Counter = Counter()
    for (tags_json,) in tag_rows.fetchall():
        try:
            tags = json.loads(tags_json)
            tag_counter.update(tags)
        except Exception:
            pass

    top_tags = [{"tag": t, "count": c} for t, c in tag_counter.most_common(8)]

    # recent 24h submission count vs previous 24h
    trend_res = await db.execute(
        text("""
            SELECT
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS recent,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '48 hours'
                                   AND created_at <  NOW() - INTERVAL '24 hours') AS previous
            FROM raw_checkins
        """)
    )
    t = trend_res.fetchone()
    submission_trend = {
        "last_24h": t.recent if t else 0,
        "prev_24h": t.previous if t else 0,
    }

    # high-distress signal: high stress + negative valence
    distress_res = await db.execute(
        select(func.count(RawCheckin.id)).where(
            RawCheckin.stress_level > 7,
            RawCheckin.valence < -0.3,
        )
    )
    distress_count = distress_res.scalar() or 0

    return {
        "top_tags": top_tags,
        "submission_trend": submission_trend,
        "high_distress_signals": distress_count,
    }
