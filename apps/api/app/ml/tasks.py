from app.ml.celery_app import celery_app
from app.ml.registry import get_current_model
import numpy as np

# Lazy load sentence transformer with fallback for low-memory environments
_embedder = None

def get_embedder():
    global _embedder
    if _embedder is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedder = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception:
            class _TFIDFEmbedder:
                def __init__(self):
                    from sklearn.feature_extraction.text import HashingVectorizer
                    self.vectorizer = HashingVectorizer(n_features=384, alternate_sign=False)
                def encode(self, text, normalize_embeddings=True):
                    if isinstance(text, str):
                        vec = self.vectorizer.transform([text]).toarray()[0]
                        if normalize_embeddings:
                            norm = float(np.linalg.norm(vec))
                            vec = vec / (norm or 1.0)
                        return vec
                    else:
                        vec = self.vectorizer.transform(text).toarray()
                        if normalize_embeddings:
                            norm = np.linalg.norm(vec, axis=1, keepdims=True)
                            norm[norm == 0] = 1.0
                            vec = vec / norm
                        return vec
            _embedder = _TFIDFEmbedder()
    return _embedder

class _LazyEmbedder:
    def encode(self, *args, **kwargs):
        return get_embedder().encode(*args, **kwargs)

embedder = _LazyEmbedder()

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
    - sentence embedding as json string for semantic similarity queries
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

        raw_emb = embedder.encode(text, normalize_embeddings=True)
        embedding = raw_emb.tolist() if hasattr(raw_emb, "tolist") else list(raw_emb)
        valence = _sentiment_score(text)

    except Exception as exc:
        try:
            raise self.retry(exc=exc, countdown=5)
        except Exception:
            return {"category": "Medium", "confidence": None, "valence": 0.0}


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

    try:
        from bertopic import BERTopic
        topic_model = BERTopic(min_topic_size=5, calculate_probabilities=False)
        topics, _ = topic_model.fit_transform(docs)
        topic_info = topic_model.get_topic_info().to_dict(orient="records")
    except Exception:
        from sklearn.feature_extraction.text import TfidfVectorizer
        vec = TfidfVectorizer(stop_words="english", max_features=10)
        vec.fit(docs)
        terms = vec.get_feature_names_out().tolist()
        topic_info = [{"Topic": i, "Count": max(len(docs)//max(len(terms), 1), 1), "Name": term} for i, term in enumerate(terms)]
        topics = list(range(len(topic_info)))

    # pass top 10 topics with their representative words
    summary = generate_weekly_summary(str(topic_info[:10]))
    return {
        "topics_found": len(set(topics)),
        "documents_processed": len(docs),
        "summary": summary,
    }

