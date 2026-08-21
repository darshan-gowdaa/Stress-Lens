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
    
    import datetime
    now = datetime.datetime.now(datetime.timezone.utc)
    start_date = now - datetime.timedelta(days=days)
    
    result = await db.execute(
        select(RawCheckin.created_at, RawCheckin.stress_level, RawCheckin.valence)
        .where(RawCheckin.created_at >= start_date)
    )
    
    from collections import defaultdict
    day_stresses = defaultdict(list)
    day_valences = defaultdict(list)
    
    for row in result.all():
        if not row.created_at: continue
        day_str = row.created_at.strftime("%Y-%m-%d")
        day_stresses[day_str].append(row.stress_level)
        if row.valence is not None:
            day_valences[day_str].append(row.valence)
            
    trend_data = []
    for day in sorted(day_stresses.keys()):
        stresses = day_stresses[day]
        valences = day_valences[day]
        
        avg_stress = sum(stresses) / len(stresses)
        avg_valence = sum(valences) / len(valences) if valences else None
        
        trend_data.append({
            "day": day,
            "avg_stress": round(avg_stress, 2),
            "avg_valence": round(avg_valence, 3) if avg_valence is not None else None,
            "count": len(stresses)
        })
        
    return {"data": trend_data}


@router.get("/aggregate")
async def get_aggregate(db: AsyncSession = Depends(get_db)):
    """Avg stress per department (k-anonymity enforced)."""
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

    # calculate submission trend (last 24h vs prev 24h)
    import datetime
    now = datetime.datetime.now(datetime.timezone.utc)
    t_24 = now - datetime.timedelta(hours=24)
    t_48 = now - datetime.timedelta(hours=48)
    
    recent_res = await db.execute(select(func.count(RawCheckin.id)).where(RawCheckin.created_at >= t_24))
    recent_count_val = recent_res.scalar() or 0
    prev_res = await db.execute(
        select(func.count(RawCheckin.id))
        .where(RawCheckin.created_at >= t_48)
        .where(RawCheckin.created_at < t_24)
    )
    
    submission_trend = {
        "last_24h": recent_count_val,
        "prev_24h": prev_res.scalar() or 0
    }

    # high distress signals
    distress_res = await db.execute(
        select(func.count(RawCheckin.id))
        .where(RawCheckin.stress_level > 7)
        .where(RawCheckin.valence < -0.2)
    )
    distress_count = distress_res.scalar() or 0
    
    # simulated concept drift (based on unexpected valence vs stress mismatch)
    drift_res = await db.execute(
        select(func.count(RawCheckin.id))
        .where(RawCheckin.stress_level > 8)
        .where(RawCheckin.valence > 0.5)
    )
    drift_count = drift_res.scalar() or 0
    drift_score = round(min(drift_count / max(recent_count_val or 1, 1) * 10, 1.0), 2)

    return {
        "top_tags": top_tags,
        "submission_trend": submission_trend,
        "high_distress_signals": distress_count,
        "concept_drift_score": drift_score,
    }


@router.get("/valence-correlation")
async def get_valence_correlation(db: AsyncSession = Depends(get_db)):
    """Avg valence per stress level to show correlation."""
    result = await db.execute(
        select(
            RawCheckin.stress_level,
            func.avg(RawCheckin.valence).label("avg_valence")
        )
        .group_by(RawCheckin.stress_level)
        .order_by(RawCheckin.stress_level)
    )
    
    # Pad to all 10 levels
    valences = {r.stress_level: r.avg_valence for r in result.all()}
    
    return {
        "data": [
            {
                "stress_level": i,
                "avg_valence": round(valences[i], 3) if i in valences and valences[i] is not None else 0
            }
            for i in range(1, 11)
        ]
    }


@router.get("/confidence-histogram")
async def get_confidence_histogram(db: AsyncSession = Depends(get_db)):
    """Histogram of model prediction confidences."""
    result = await db.execute(select(Prediction.confidence).where(Prediction.confidence.isnot(None)))
    confidences = [r.confidence for r in result.all()]
    
    bins = {"0.0-0.2": 0, "0.2-0.4": 0, "0.4-0.6": 0, "0.6-0.8": 0, "0.8-1.0": 0}
    for c in confidences:
        if c < 0.2: bins["0.0-0.2"] += 1
        elif c < 0.4: bins["0.2-0.4"] += 1
        elif c < 0.6: bins["0.4-0.6"] += 1
        elif c < 0.8: bins["0.6-0.8"] += 1
        else: bins["0.8-1.0"] += 1
        
    return {
        "data": [{"bin": k, "count": v} for k, v in bins.items()]
    }

from pydantic import BaseModel
class SearchQuery(BaseModel):
    text: str
    top_k: int = 5

@router.post("/semantic-search")
async def semantic_search(query: SearchQuery, db: AsyncSession = Depends(get_db)):
    """Search historical check-ins semantically."""
    from sentence_transformers import SentenceTransformer
    import json
    import numpy as np
    
    # We should cache the encoder, but for simplicity here we just use what's loaded 
    # or load it. Actually better to use the embedder in ml/tasks.py
    from app.ml.tasks import embedder
    
    query_emb = embedder.encode(query.text, normalize_embeddings=True).tolist()
    
    # fetch all embeddings from DB
    result = await db.execute(select(RawCheckin.id, RawCheckin.text_redacted, RawCheckin.stress_level, RawCheckin.embedding).where(RawCheckin.embedding.isnot(None)))
    rows = result.all()
    
    similarities = []
    q_vec = np.array(query_emb)
    
    for row in rows:
        try:
            db_emb = json.loads(row.embedding)
            db_vec = np.array(db_emb)
            score = np.dot(q_vec, db_vec)
            similarities.append({
                "id": row.id,
                "text": row.text_redacted,
                "stress_level": row.stress_level,
                "score": float(score)
            })
        except Exception:
            pass
            
    similarities.sort(key=lambda x: x["score"], reverse=True)
    return {"results": similarities[:query.top_k]}

@router.post("/trigger-clustering")
async def trigger_clustering():
    """Trigger BERTopic clustering on historical checkins."""
    from app.ml.tasks import weekly_clustering
    
    # Normally this would be asynchronous via Celery `delay()`, 
    # but for dashboard demonstration we run it directly.
    try:
        res = weekly_clustering()
        return res
    except Exception as e:
        return {"error": str(e)}

from pydantic import BaseModel

@router.get("/top-stress-drivers")
async def get_top_stress_drivers(db: AsyncSession = Depends(get_db)):
    """Returns top keywords strongly associated with High Stress using TF-IDF."""
    from sklearn.feature_extraction.text import TfidfVectorizer
    import numpy as np

    # Fetch all recent check-ins
    res = await db.execute(select(RawCheckin.text_redacted, RawCheckin.stress_level).where(RawCheckin.stress_level.isnot(None)))
    rows = res.all()
    if not rows:
        return {"data": []}

    high_stress_texts = [r.text_redacted for r in rows if r.stress_level >= 7]
    low_stress_texts = [r.text_redacted for r in rows if r.stress_level <= 4]
    
    if not high_stress_texts or not low_stress_texts:
        return {"data": []}

    # Combine into two big documents
    doc_high = " ".join(high_stress_texts)
    doc_low = " ".join(low_stress_texts)

    vectorizer = TfidfVectorizer(stop_words='english', max_features=50)
    tfidf_matrix = vectorizer.fit_transform([doc_high, doc_low])
    
    feature_names = vectorizer.get_feature_names_out()
    high_stress_scores = tfidf_matrix.toarray()[0]
    low_stress_scores = tfidf_matrix.toarray()[1]

    # Find words with high TF-IDF in high stress document, and significantly higher than in low stress
    diff_scores = high_stress_scores - low_stress_scores
    top_indices = np.argsort(diff_scores)[::-1][:8]

    drivers = []
    for idx in top_indices:
        if diff_scores[idx] > 0:
            drivers.append({"keyword": feature_names[idx], "importance": round(float(diff_scores[idx]), 3)})

    return {"data": drivers}
