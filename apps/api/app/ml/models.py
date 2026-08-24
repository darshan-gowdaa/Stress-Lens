from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# 3 output classes: 0=Low, 1=Medium, 2=High stress
NUM_CLASSES = 3

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    _TORCH_AVAILABLE = True
except Exception:
    _TORCH_AVAILABLE = False
    class _DummyModule:
        pass
    torch = None
    nn = type('nn', (), {'Module': _DummyModule})()
    F = None


class StressMLP(nn.Module):
    """Multi-layer perceptron for stress classification from text embeddings.

    Uses BatchNorm for stable training and returns both logits and
    softmax probabilities so callers can get confidence scores.
    """

    def __init__(self, input_dim: int = 384):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.BatchNorm1d(256),
            nn.GELU(),  # smoother than ReLU for NLP embeddings
            nn.Dropout(0.3),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.GELU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.GELU(),
            nn.Linear(64, NUM_CLASSES),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)

    def predict_with_confidence(self, x: torch.Tensor) -> tuple[list[int], list[float]]:
        """Return predicted class indices and max-softmax confidence scores."""
        self.eval()
        with torch.no_grad():
            logits = self.forward(x)
            probs = F.softmax(logits, dim=-1)
            confidences, preds = probs.max(dim=-1)
        return preds.tolist(), confidences.tolist()


class SentimentHead(nn.Module):
    """Lightweight regression head to estimate valence (-1 to 1) from embeddings.

    Added as a secondary signal alongside stress category — negative valence
    combined with high stress is a stronger intervention flag.
    """

    def __init__(self, input_dim: int = 384):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.GELU(),
            nn.Linear(64, 1),
            nn.Tanh(),  # output in [-1, 1]
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x).squeeze(-1)


from sklearn.base import BaseEstimator, TransformerMixin

class DistilBertEncoder(BaseEstimator, TransformerMixin):
    def __init__(self, model_name="all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.encoder = None
        
    def fit(self, X, y=None):
        return self
        
    def transform(self, X):
        try:
            from sentence_transformers import SentenceTransformer
            if self.encoder is None:
                self.encoder = SentenceTransformer(self.model_name)
            return self.encoder.encode(X)
        except Exception:
            from sklearn.feature_extraction.text import HashingVectorizer
            import numpy as np
            vec = HashingVectorizer(n_features=384, alternate_sign=False).transform(X).toarray()
            norm = np.linalg.norm(vec, axis=1, keepdims=True)
            norm[norm == 0] = 1.0
            return vec / norm



def get_baseline_model() -> Pipeline:
    """TF-IDF + Logistic Regression fallback when MLflow model unavailable.

    Uses ngrams(1,2) and balanced class weight to handle uneven stress distributions.
    """
    return Pipeline([
        ('tfidf', TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2),
            sublinear_tf=True,  # log TF dampening for common words
        )),
        ('clf', LogisticRegression(
            max_iter=1000,
            class_weight='balanced',
            C=1.0,
        )),
    ])
