import mlflow
import torch
from sentence_transformers import SentenceTransformer
from app.ml.models import get_baseline_model, StressMLP
from sklearn.metrics import f1_score
from transformers import pipeline

class TransformerPredictor:
    def __init__(self):
        self.pipe = pipeline("text-classification", model="distilbert-base-uncased-finetuned-sst-2-english")
    
    def predict(self, texts):
        return [1 if res['label'] == 'NEGATIVE' else 0 for res in self.pipe(texts)]

def train_baseline(texts, labels):
    model = get_baseline_model()
    model.fit(texts, labels)
    preds = model.predict(texts)
    f1 = f1_score(labels, preds, average='weighted')
    
    mlflow.set_experiment("stress_classification")
    with mlflow.start_run(run_name="baseline_lr"):
        mlflow.log_metric("f1_score", f1)
        mlflow.sklearn.log_model(model, "model", registered_model_name="stress_classifier")
    return model

def train_mlp(texts, labels):
    # Dummy embedder for MLP input
    embedder = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = embedder.encode(texts)
    
    # Train PyTorch MLP
    model = StressMLP(input_dim=384)
    criterion = torch.nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    
    X = torch.tensor(embeddings, dtype=torch.float32)
    y = torch.tensor(labels, dtype=torch.long)
    
    for epoch in range(50):
        optimizer.zero_grad()
        out = model(X)
        loss = criterion(out, y)
        loss.backward()
        optimizer.step()
        
    with torch.no_grad():
        preds = torch.argmax(model(X), dim=1).numpy()
    f1 = f1_score(labels, preds, average='weighted')
    
    with mlflow.start_run(run_name="mlp"):
        mlflow.log_metric("f1_score", f1)
        mlflow.pytorch.log_model(model, "model", registered_model_name="stress_classifier_mlp")
    return model

if __name__ == "__main__":
    texts = ["I am very stressed", "This course is easy", "Finals are killing me", "Feeling good"]
    labels = [2, 0, 2, 0] # 0: low, 1: med, 2: high
    
    # Train both
    train_baseline(texts, labels)
    train_mlp(texts, labels)
