import os
import sys
import asyncio
import numpy as np

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.future import select
from app.core.database import SessionLocal
from app.domains.checkins.repository import RawCheckin
import mlflow
import mlflow.sklearn
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from app.ml.models import DistilBertEncoder
from app.core.config import settings

mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)

async def fetch_data():
    async with SessionLocal() as session:
        result = await session.execute(select(RawCheckin).where(RawCheckin.stress_level.isnot(None)))
        return result.scalars().all()

def train():
    print("Fetching data from SQLite...")
    data = asyncio.run(fetch_data())
    
    texts = []
    labels = []
    for row in data:
        texts.append(row.text_redacted)
        if row.stress_level <= 3:
            labels.append(0)
        elif row.stress_level <= 7:
            labels.append(1)
        else:
            labels.append(2)
            
    if not texts:
        print("No data found!")
        return
        
    print(f"Loaded {len(texts)} checkins.")
    
    # Build a native sklearn pipeline
    pipeline = Pipeline([
        ('encoder', DistilBertEncoder()),
        ('clf', RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42))
    ])
    
    print("Training Pipeline...")
    pipeline.fit(texts, labels)
    
    print("Logging to MLFlow...")
    mlflow.set_experiment("Stress_Classifier")
    with mlflow.start_run() as run:
        mlflow.log_param("n_estimators", 100)
        mlflow.log_param("encoder", "all-MiniLM-L6-v2")
        
        # log as standard sklearn model
        mlflow.sklearn.log_model(
            sk_model=pipeline,
            artifact_path="model", serialization_format="cloudpickle",
            registered_model_name="stress_classifier"
        )
        
        client = mlflow.tracking.MlflowClient()
        latest_versions = client.get_latest_versions("stress_classifier", stages=["None"])
        if latest_versions:
            latest_version = latest_versions[-1].version
            client.transition_model_version_stage(
                name="stress_classifier",
                version=latest_version,
                stage="Production",
                archive_existing_versions=True
            )
            print(f"Promoted stress_classifier version {latest_version} to Production.")

    print("Done!")

if __name__ == "__main__":
    train()
