from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression



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
