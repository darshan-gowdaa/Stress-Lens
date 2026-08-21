import nbformat as nbf

nb = nbf.v4.new_notebook()

nb['cells'] = [
    nbf.v4.new_markdown_cell("""# StressLens: Advanced Data Analytics & ML Pipeline Architecture
### Course: MSc Data Analytics - Capstone Project
---

This document outlines the exact computational steps, mathematical foundations, and implementation details of the machine learning backend powering the **StressLens** platform. 

Our architecture consists of three primary components:
1. **Supervised Classification Pipeline**: Predicting stress categories from high-dimensional text embeddings.
2. **Semantic Search Engine**: Fast vector retrieval using Cosine Similarity.
3. **Unsupervised Topic Modeling**: Density-based clustering (HDBSCAN) over manifold approximations (UMAP)."""),

    nbf.v4.new_markdown_cell("---"),
    nbf.v4.new_markdown_cell("## 1. Data Ingestion & Sanitization\nWe connect to the local SQLite transactional database `stresslens.db` to extract historical anonymized student check-in records."),
    nbf.v4.new_code_cell("""import pandas as pd
import sqlite3
import numpy as np
import warnings
warnings.filterwarnings('ignore')
import matplotlib.pyplot as plt
import seaborn as sns

# 1. Establish Database Connection
conn = sqlite3.connect('stresslens.db')

# 2. Extract Data (Filtering out incomplete checkins)
query = '''
SELECT text_redacted, stress_level, sleep_hours, tags, created_at, course_hash, dept_hash 
FROM raw_checkins 
WHERE stress_level IS NOT NULL
'''
df = pd.read_sql_query(query, conn)
df['created_at'] = pd.to_datetime(df['created_at'])

print(f"Extracted {len(df)} validated check-in records.")
display(df.head())"""),

    nbf.v4.new_markdown_cell("### 1.1 Data Profiling (df.info & df.describe)\nIn any robust ML pipeline, we must profile the raw dataset to understand feature sparsity and central tendencies."),
    nbf.v4.new_code_cell("""print("Dataset Information:")
print("-" * 40)
df.info()

print("\\nDataset Statistical Summary:")
print("-" * 40)
display(df.describe(include='all', ))

print("\\nMissing Values Summary:")
print("-" * 40)
display(df.isnull().sum())"""),

    nbf.v4.new_markdown_cell("### 1.2 Text Length & Stress Distribution Analysis\nUnderstanding the distribution of our target variable (`stress_level`) and the character length of the corpus texts before vectorization."),
    nbf.v4.new_code_cell("""df['text_length'] = df['text_redacted'].apply(lambda x: len(str(x)))

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
sns.set_theme(style="whitegrid")

# Distribution of Stress
sns.histplot(df['stress_level'], bins=10, kde=True, color='#006874', ax=ax1)
ax1.set_title('Distribution of Target: Stress Levels (1-10)', fontweight='bold')
ax1.set_xlabel('Stress Level')

# Distribution of Text Length
sns.histplot(df['text_length'], bins=30, kde=True, color='#B3261E', ax=ax2)
ax2.set_title('Corpus Character Length Distribution', fontweight='bold')
ax2.set_xlabel('Character Length')

plt.tight_layout()
plt.show()"""),

    nbf.v4.new_markdown_cell("## 2. Text Vectorization: Sentence-BERT (SBERT)\nRaw text cannot be processed directly by our Random Forest classifier. We utilize a pre-trained transformer model, specifically `all-MiniLM-L6-v2`, to map textual data to a 384-dimensional dense vector space. This model employs mean pooling over the token embeddings to produce a single fixed-length vector representing the semantic meaning of the entire sentence.\n\nMathematically, for a sequence of tokens $T$, the embedding $v$ is computed as:\n$$ v = \\frac{1}{|T|} \\sum_{t \\in T} \\text{Transformer}(t) $$"),
    nbf.v4.new_code_cell("""from sentence_transformers import SentenceTransformer
import time

# Initialize the SBERT encoder
print("Loading SBERT model (all-MiniLM-L6-v2)...")
encoder = SentenceTransformer('all-MiniLM-L6-v2')

# Vectorization Process
start_time = time.time()
texts = df['text_redacted'].tolist()
embeddings = encoder.encode(texts, show_progress_bar=True)
compute_time = time.time() - start_time

print(f"Generated embedding matrix of shape: {embeddings.shape} in {compute_time:.2f} seconds.")
print(f"   -> Dimensionality: $d = {embeddings.shape[1]}$")"""),

    nbf.v4.new_markdown_cell("## 3. Supervised Classification: Random Forest\nTo map the continuous embedding space $R^{384}$ to discrete stress severity classes $Y \\in \\{\\text{Low}, \\text{Moderate}, \\text{High}\\}$, we deploy a Random Forest ensemble. We apply a uniform class weight balancing technique `class_weight='balanced'` to penalize majority class dominance, effectively weighting samples inversely proportional to class frequencies:\n$$ w_j = \\frac{n}{k \\cdot n_j} $$"),
    nbf.v4.new_code_cell("""from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

# Target Variable Discretization
def discretize_stress(level):
    if level <= 3: return 'Low'
    if level <= 6: return 'Moderate'
    return 'High'

df['stress_category'] = df['stress_level'].apply(discretize_stress)
labels = df['stress_category'].tolist()

# 80/20 Stratified Split
X_train, X_test, y_train, y_test = train_test_split(
    embeddings, labels, test_size=0.2, random_state=42, stratify=labels
)

# Model Initialization
rf_classifier = RandomForestClassifier(
    n_estimators=100, 
    class_weight='balanced', 
    random_state=42
)
print("Fitting Random Forest Ensemble...")
rf_classifier.fit(X_train, y_train)

# Inference
y_pred = rf_classifier.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"\\nHoldout Test Accuracy: {accuracy*100:.2f}%")"""),

    nbf.v4.new_markdown_cell("### 3.1 Detailed ML Evaluation\nWe evaluate Precision, Recall, and F1-Score for each class, followed by Cross-Validation to ensure robustness across folds, and a Confusion Matrix Heatmap to view exact misclassifications."),
    nbf.v4.new_code_cell("""print("Classification Report (Test Set):")
print(classification_report(y_test, y_pred))

# 5-Fold Cross Validation
print("Running 5-Fold Stratified Cross Validation...")
cv_scores = cross_val_score(rf_classifier, embeddings, labels, cv=5, scoring='accuracy')
print(f"CV Accuracy Scores: {cv_scores}")
print(f"Mean CV Accuracy: {cv_scores.mean():.3f} (± {cv_scores.std()*2:.3f})")

# Confusion Matrix Heatmap
cm = confusion_matrix(y_test, y_pred, labels=['Low', 'Moderate', 'High'])
plt.figure(figsize=(6, 4))
sns.heatmap(cm, annot=True, fmt='d', cmap='mako', 
            xticklabels=['Low', 'Moderate', 'High'], 
            yticklabels=['Low', 'Moderate', 'High'])
plt.title('Prediction Confusion Matrix (Test Set)', pad=15, fontweight='bold')
plt.xlabel('Predicted Category')
plt.ylabel('Ground Truth Category')
plt.show()"""),

    nbf.v4.new_markdown_cell("## 4. Semantic Search Mechanism (Backend Implementation)\nOur dashboard's semantic search capability relies on the **Cosine Similarity** metric to find historically similar check-ins. For a query vector $A$ and a document vector $B$, similarity is computed as the normalized dot product:\n$$ \\text{Similarity} = \\cos(\\theta) = \\frac{A \\cdot B}{\\|A\\| \\|B\\|} $$"),
    nbf.v4.new_code_cell("""from numpy import dot
from numpy.linalg import norm

def calculate_cosine_similarity(query_text, document_embeddings, top_k=3):
    # 1. Encode query
    q_vec = encoder.encode([query_text])[0]
    
    # 2. Compute Cosine Similarity against all documents
    similarities = []
    q_norm = norm(q_vec)
    for idx, doc_vec in enumerate(document_embeddings):
        score = dot(q_vec, doc_vec) / (q_norm * norm(doc_vec))
        similarities.append((idx, score))
        
    # 3. Sort and retrieve Top-K
    similarities.sort(key=lambda x: x[1], reverse=True)
    
    print(f"\U0001f50d Top {top_k} results for: '{query_text}'\\n" + "-"*50)
    for rank, (idx, score) in enumerate(similarities[:top_k], 1):
        print(f"Rank {rank} (Score: {score:.3f}): {texts[idx]}\\n")

# Test the function exactly as it operates in `router.py`
calculate_cosine_similarity("I am feeling overwhelmed by the upcoming exams and continuous assignments.", embeddings)"""),

    nbf.v4.new_markdown_cell("## 5. Unsupervised Topic Modeling (BERTopic Pipeline)\nTo uncover emergent themes without predefined labels, we implement BERTopic. This pipeline consists of 3 mathematical steps:\n1. **UMAP**: Reduces the 384D embedding space to a 5D manifold, preserving local/global structures.\n2. **HDBSCAN**: Identifies high-density clusters within the lower-dimensional space, handling noise (outliers) gracefully.\n3. **c-TF-IDF**: Extracts class-based Term Frequency-Inverse Document Frequency representations to assign interpretable labels to each cluster."),
    nbf.v4.new_code_cell("""from bertopic import BERTopic

print("Initializing BERTopic (UMAP + HDBSCAN + c-TF-IDF)...")
topic_model = BERTopic(min_topic_size=5, verbose=True, calculate_probabilities=False)

# Fit the pipeline on our text corpus
topics, _ = topic_model.fit_transform(texts, embeddings)

num_topics = len(topic_model.get_topic_info()) - 1
print(f"\\nPipeline completed successfully. HDBSCAN identified {num_topics} distinct topic clusters.")
display(topic_model.get_topic_info().head(8))"""),

    nbf.v4.new_markdown_cell("### 5.1 Multidimensional Scaling (Intertopic Distance)\nWe visualize the semantic similarity between the discovered topic clusters. Clusters plotted closer to each other on the 2D plane share higher lexical and semantic overlap."),
    nbf.v4.new_code_cell("""# Render interactive Plotly visualization
fig = topic_model.visualize_topics()
fig.update_layout(title="Intertopic Distance Map (UMAP Projection)")
fig.show()""")
]

with open('ML_Exploration.ipynb', 'w', encoding='utf-8') as f:
    nbf.write(nb, f)
