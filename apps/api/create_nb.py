import nbformat as nbf

nb = nbf.v4.new_notebook()

nb['cells'] = [
    nbf.v4.new_markdown_cell("""# 🧠 StressLens: Comprehensive Machine Learning Pipeline
Welcome to the ML Exploration Notebook! This document details every step of the machine learning pipeline used in StressLens to classify student check-ins and extract insights.

## Table of Contents
1. **Data Ingestion**: Loading sanitized SQLite data.
2. **Exploratory Data Analysis (EDA)**: Visualizing stress distribution and correlations.
3. **Text Vectorization**: Converting textual feedback into dense high-dimensional vectors.
4. **Predictive Modeling**: Training a `RandomForestClassifier` to predict stress levels.
5. **Model Registry**: Logging experiments and models via MLflow.
6. **Unsupervised Topic Modeling**: Discovering latent themes using `BERTopic`."""),

    nbf.v4.new_markdown_cell("---"),
    nbf.v4.new_markdown_cell("## 1. Data Ingestion\nWe connect directly to our local SQLite database `stresslens.db` to pull historical, anonymized check-in records."),
    nbf.v4.new_code_cell("""import pandas as pd
import sqlite3
import numpy as np
import warnings
warnings.filterwarnings('ignore')

# 1. Connect to database
conn = sqlite3.connect('stresslens.db')

# 2. Fetch all valid checkins
query = 'SELECT text_redacted, stress_level, sleep_hours, tags, created_at FROM raw_checkins WHERE stress_level IS NOT NULL'
df = pd.read_sql_query(query, conn)

print(f"✅ Loaded {len(df)} historical check-ins.")
df['created_at'] = pd.to_datetime(df['created_at'])
display(df.head())"""),

    nbf.v4.new_markdown_cell("## 2. Exploratory Data Analysis (EDA)\nLet's analyze the distribution of self-reported stress levels and their relationship with sleep hours."),
    nbf.v4.new_code_cell("""import matplotlib.pyplot as plt
import seaborn as sns

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
sns.set_theme(style="whitegrid")

# Distribution of Stress
sns.histplot(df['stress_level'], bins=10, kde=True, color='#006874', ax=ax1)
ax1.set_title('Distribution of Reported Stress Levels (1-10)', fontweight='bold')
ax1.set_xlabel('Stress Level')

# Stress vs Sleep
sns.boxplot(x=df['stress_level'], y=df['sleep_hours'], palette="crest", ax=ax2)
ax2.set_title('Correlation: Stress Level vs Sleep Hours', fontweight='bold')
ax2.set_xlabel('Stress Level')
ax2.set_ylabel('Hours of Sleep')

plt.tight_layout()
plt.show()"""),

    nbf.v4.new_markdown_cell("## 3. Text Vectorization (Embeddings)\nTo feed raw text into a machine learning model, we must first encode the sentences into mathematical vectors. We use `all-MiniLM-L6-v2` via the `sentence-transformers` library, which maps sentences to a 384-dimensional dense vector space."),
    nbf.v4.new_code_cell("""from sentence_transformers import SentenceTransformer

# Load the lightweight DistilBERT encoder
print("Loading model: all-MiniLM-L6-v2...")
encoder = SentenceTransformer('all-MiniLM-L6-v2')

# Generate embeddings for the entire corpus
print("Computing embeddings...")
texts = df['text_redacted'].tolist()
embeddings = encoder.encode(texts, show_progress_bar=True)

print(f"✅ Generated embeddings matrix of shape: {embeddings.shape} (Documents x Dimensions)")"""),

    nbf.v4.new_markdown_cell("## 4. Predictive Modeling: Random Forest Classifier\nWe train a robust `RandomForestClassifier` to map the 384-dimensional vectors to discrete Stress Categories (Low, Moderate, High). We use `class_weight='balanced'` to prevent bias toward the majority class."),
    nbf.v4.new_code_cell("""from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix

# Create target labels (Low: 1-3, Moderate: 4-6, High: 7-10)
def categorize_stress(level):
    if level <= 3: return 'Low'
    if level <= 6: return 'Moderate'
    return 'High'

df['stress_category'] = df['stress_level'].apply(categorize_stress)
labels = df['stress_category'].tolist()

# Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(embeddings, labels, test_size=0.2, random_state=42)

# Initialize and Train Model
clf = RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42)
print("Training Random Forest Classifier on high-dimensional vectors...")
clf.fit(X_train, y_train)

# Evaluate
y_pred = clf.predict(X_test)
print("\\n📊 Classification Report:")
print(classification_report(y_test, y_pred))"""),

    nbf.v4.new_markdown_cell("### Confusion Matrix\nVisualizing the model's performance and misclassifications across the 3 categories."),
    nbf.v4.new_code_cell("""cm = confusion_matrix(y_test, y_pred, labels=['Low', 'Moderate', 'High'])
plt.figure(figsize=(6,4))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=['Low', 'Moderate', 'High'], yticklabels=['Low', 'Moderate', 'High'])
plt.title('Prediction Confusion Matrix')
plt.xlabel('Predicted Category')
plt.ylabel('Actual Category')
plt.show()"""),

    nbf.v4.new_markdown_cell("## 5. Model Registry (MLflow)\nOur production system automatically packages this model as an `sklearn.pipeline.Pipeline` and logs it to a local SQLite-backed MLflow registry. This ensures reproducibility and easy deployment."),
    nbf.v4.new_code_cell("""import mlflow
from mlflow.tracking import MlflowClient

# Connect to our local MLflow registry
mlflow.set_tracking_uri("sqlite:///mlflow.db")
client = MlflowClient()

try:
    # Fetch the latest production model metadata
    model_name = "stress_classifier"
    versions = client.get_latest_versions(model_name, stages=["Production"])
    if versions:
        prod_model = versions[0]
        print(f"✅ Found Production Model '{model_name}' (Version: {prod_model.version})")
        print(f"Status: {prod_model.current_stage}")
        print(f"Run ID: {prod_model.run_id}")
    else:
        print("No production model found.")
except Exception as e:
    print("Could not connect to MLflow registry:", e)"""),

    nbf.v4.new_markdown_cell("## 6. Unsupervised Topic Modeling (BERTopic)\nInstead of relying solely on predefined categories, we use Density-Based Spatial Clustering (HDBSCAN) combined with UMAP dimensionality reduction to discover natural topic clusters emerging organically from the student feedback."),
    nbf.v4.new_code_cell("""from bertopic import BERTopic

print("Initializing BERTopic pipeline (UMAP + HDBSCAN + c-TF-IDF)...")
# We set calculate_probabilities=False for performance on large datasets
topic_model = BERTopic(min_topic_size=5, verbose=True)

# Fit the topic model using our precomputed embeddings
topics, probs = topic_model.fit_transform(texts, embeddings)

print(f"\\n✅ BERTopic discovered {len(topic_model.get_topic_info()) - 1} distinct topics (excluding outliers).")
display(topic_model.get_topic_info().head(8))"""),

    nbf.v4.new_markdown_cell("### Topic Distance Map\nAn Intertopic Distance Map visualizes the relationships between the discovered themes in a 2D space (using multidimensional scaling)."),
    nbf.v4.new_code_cell("""# Visualize Intertopic Distance Map
# Note: For static HTML export, we use show() directly which renders interactive plotly charts.
fig = topic_model.visualize_topics()
fig.show()""")
]

with open('ML_Exploration.ipynb', 'w', encoding='utf-8') as f:
    nbf.write(nb, f)
