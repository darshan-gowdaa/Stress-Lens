import mlflow
import time
from app.core.config import settings
from app.ml.models import get_baseline_model

mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)

# cached model + metadata so we don't reload on every prediction
_cache: dict = {"model": None, "loaded_at": 0, "source": "none"}
_CACHE_TTL = 300  # reload from MLflow at most every 5 minutes


def get_current_model():
    """Load stress classifier from MLflow or fall back to baseline.

    Returns the model object and caches it for TTL seconds.
    """
    now = time.time()
    if _cache["model"] is not None and (now - _cache["loaded_at"]) < _CACHE_TTL:
        return _cache["model"]

    try:
        model = mlflow.sklearn.load_model("models:/stress_classifier/Production")
        if not hasattr(model, "predict"):
            raise ValueError("Model missing predict")
        _cache.update({"model": model, "loaded_at": now, "source": "mlflow"})
        return model
    except Exception:
        # dummy-trained baseline so predict() works immediately without data
        pipeline = get_baseline_model()
        pipeline.fit(
            ["calm relaxed", "moderate stressed", "high crisis panic"],
            ["low", "medium", "high"],
        )
        _cache.update({"model": pipeline, "loaded_at": now, "source": "baseline"})
        return pipeline


def get_model_meta() -> dict:
    """Return metadata about which model is currently active."""
    get_current_model()  # ensure cache is warm
    return {
        "source": _cache["source"],
        "loaded_at": _cache["loaded_at"],
        "age_seconds": round(time.time() - _cache["loaded_at"]),
    }


def invalidate_cache():
    """Force reload on next prediction call (e.g. after model promotion)."""
    _cache["model"] = None
    _cache["loaded_at"] = 0
