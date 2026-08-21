from app.ml.celery_app import celery_app
from app.ml.registry import get_current_model
from sentence_transformers import SentenceTransformer
from bertopic import BERTopic
import numpy as np

# load once at worker startup — avoids repeated cold-loads per task
embedder = SentenceTransformer("all-MiniLM-L6-v2")

# label names aligned with baseline model outputs
LABEL_MAP = {"low": "Low", "medium": "Medium", "high": "High",
             "0": "Low", "1": "Medium", "2": "High"}


def _sentiment_score(text: str) -> float:
    """Simple lexicon-based valence score in [-1, 1].

    Not a full sentiment model — just enough to flag negative affect
    alongside high stress. Avoids adding a heavy dependency.
    """
    positive = {"calm", "good", "happy", "okay", "fine", "hopeful", "motivated", "relaxed", "excited"}
    negative = {"stressed", "anxious", "overwhelmed", "panic", "crisis", "tired", "burnt", "lonely", "frustrated", "confused", "helpless"}
    tokens = set(text.lower().split())
    pos = len(tokens & positive)
    neg = len(tokens & negative)
    total = pos + neg or 1
    return round((pos - neg) / total, 3)


@celery_app.task(name="predict_stress_category", bind=True, max_retries=3)
def predict_stress_category(self, checkin_id: int, text: str):
    """Predict stress category + compute embedding for a new check-in.

    Stores:
    - predicted category (Low/Medium/High) in predictions table
    - confidence score (0–1) for the prediction
    - sentence embedding as pgvector for semantic similarity queries
    - valence score on the raw_checkins row for downstream filtering
    """
    try:
        model = get_current_model()
        raw_pred = str(model.predict([text])[0])
        category = LABEL_MAP.get(raw_pred, raw_pred)

        # confidence: use predict_proba if available (sklearn pipelines)
        confidence = None
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba([text])[0]
            confidence = round(float(np.max(proba)), 4)

        embedding = embedder.encode(text, normalize_embeddings=True).tolist()
        valence = _sentiment_score(text)

    except Exception as exc:
        raise self.retry(exc=exc, countdown=5)

    from app.core.sync_database import SyncSessionLocal
    from sqlalchemy import text as sa_text

    db = SyncSessionLocal()
    try:
        # upsert prediction with confidence
        db.execute(
            sa_text(
                "INSERT INTO predictions (checkin_id, category, confidence) "
                "VALUES (:id, :cat, :conf) "
                "ON CONFLICT (checkin_id) DO UPDATE SET category=:cat, confidence=:conf"
            ),
            {"id": checkin_id, "cat": category, "conf": confidence},
        )
        # store embedding + valence on the check-in row
        import json
        emb_str = json.dumps(embedding)
        db.execute(
            sa_text(
                "UPDATE raw_checkins SET embedding=:emb, valence=:val WHERE id=:id"
            ),
            {"emb": emb_str, "val": valence, "id": checkin_id},
        )
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()

    return {"category": category, "confidence": confidence, "valence": valence}


@celery_app.task(name="weekly_clustering")
def weekly_clustering():
    """Run BERTopic on all redacted texts and generate a staff-facing summary.

    Requires at least 10 documents. Results in topic count + AI summary string.
    """
    from app.core.sync_database import SyncSessionLocal
    from sqlalchemy import text as sa_text
    from app.ml.genai import generate_weekly_summary

    db = SyncSessionLocal()
    try:
        rows = db.execute(
            sa_text("SELECT text_redacted FROM raw_checkins WHERE text_redacted IS NOT NULL")
        ).fetchall()
        docs = [r[0] for r in rows]
    finally:
        db.close()

    if len(docs) < 10:
        return {"skipped": True, "reason": "not enough data", "needed": 10 - len(docs)}

    topic_model = BERTopic(min_topic_size=5, calculate_probabilities=False)
    topics, _ = topic_model.fit_transform(docs)

    topic_info = topic_model.get_topic_info().to_dict(orient="records")
    # pass top 10 topics with their representative words
    summary = generate_weekly_summary(str(topic_info[:10]))
    return {
        "topics_found": len(set(topics)),
        "documents_processed": len(docs),
        "summary": summary,
    }


@celery_app.task(name="find_similar_checkins")
def find_similar_checkins(checkin_id: int, top_k: int = 5):
    """Return top-k semantically similar past check-ins using pgvector cosine similarity.

    Used by staff dashboard to surface recurring themes without exposing raw text.
    """
    from app.core.sync_database import SyncSessionLocal
    from sqlalchemy import text as sa_text

    db = SyncSessionLocal()
    try:
        row = db.execute(
            sa_text("SELECT embedding FROM raw_checkins WHERE id=:id"),
            {"id": checkin_id},
        ).fetchone()
        if not row or row[0] is None:
            return {"error": "No embedding found"}

        # Fetch all other embeddings
        all_others = db.execute(
            sa_text("SELECT id, stress_level, created_at, embedding FROM raw_checkins WHERE id != :id AND embedding IS NOT NULL"),
            {"id": checkin_id}
        ).fetchall()
        
        import json
        target_emb = np.array(json.loads(row[0]))
        results = []
        for r in all_others:
            try:
                emb = np.array(json.loads(r.embedding))
                sim = float(np.dot(target_emb, emb) / (np.linalg.norm(target_emb) * np.linalg.norm(emb)))
                results.append({"id": r.id, "stress_level": r.stress_level, "similarity": round(sim, 4)})
            except:
                pass
        
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:top_k]
    finally:
        db.close()
