<div align="center">
  <img width="800" height="200" alt="StressLens Banner" src="https://placehold.co/800x200/20232A/FFF?text=StressLens+Analytics" />
  
  <h3>StressLens: Anonymous Student Stress Intelligence and Workload Feedback System</h3>
  <p>A privacy-first ML platform for early detection of student overload and campus stress trends.</p>
  <p><b>Powered by FastAPI, Next.js, Celery, MLflow, PyTorch & PostgreSQL with pgvector.</b></p>
  
  <div>
    <img height="28" src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
    <img height="28" src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img height="28" src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
    <img height="28" src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img height="28" src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
    <img height="28" src="https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img height="28" src="https://img.shields.io/badge/Celery-37814A?style=for-the-badge&logo=celery&logoColor=white" alt="Celery" />
    <img height="28" src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
    <img height="28" src="https://img.shields.io/badge/Scikit--Learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white" alt="Scikit-Learn" />
    <img height="28" src="https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" alt="PyTorch" />
    <img height="28" src="https://img.shields.io/badge/MLflow-0194E2?style=for-the-badge&logo=mlflow&logoColor=white" alt="MLflow" />
  </div>
</div>

<br />

## 1. Problem Statement
Students usually do not complain until the pressure is already too high. Colleges miss early warning signals because feedback is scattered, unstructured, and often ignored. A lightweight anonymous system is needed to identify recurring stressors before they affect learning outcomes and wellbeing.

## 2. Proposed Solution
Students submit short, anonymous daily or weekly check-ins describing stress, overload, or academic pressure. The system classifies each submission into stress categories, detects sentiment and urgency, and groups recurring issues by course, batch, or department. A staff dashboard visualizes trends, heatmaps, and suggested interventions (e.g., rescheduling quizzes or spacing deadlines).

---

## 3. Why This Project is ML-Heavy
- **Text Classification**: Categorizing messy text for workload, exams, deadlines, teaching pace, admin issues, and mental stress.
- **Sentiment & Emotion Detection**: Identifying frustrated, anxious, overwhelmed, or neutral feedback (Valence scoring).
- **Topic Clustering**: Utilizing BERTopic to discover recurring themes without manual labeling.
- **Trend & Anomaly Detection**: Identifying rising stress around exams or overlapping submissions.
- **Urgency Ranking**: Prioritizing the most serious cases for immediate administrative review.

---

## 4. NLP and GenAI Usage
NLP handles short, informal, code-mixed, and messy student text through rigorous text cleaning and dense vector embeddings (`all-MiniLM-L6-v2`).

**GenAI is used strictly as a support layer**. It does not perform primary classification. It is exclusively utilized to summarize weekly stress patterns and generate admin-ready action notes.
> *Example output: "Year 2 CS students saw a 42% rise in workload stress due to overlapping deadlines and midterms."*

---

## 5. Privacy and Ethics (Trust is Essential)
- **Zero Identity Storage:** No names, roll numbers, or direct identity details are stored or displayed.
- **Aggregate Only:** Only aggregate results are shown to staff.
- **K-Anonymity Guardrails:** Very small groups (threshold < 5) are suppressed from the dashboard to prevent singling out students.
- **Automated Redaction:** Microsoft Presidio automatically redacts phone numbers, names, or email-like text from submissions before database insertion.
*If students feel monitored, they will not provide honest feedback. Anonymity is mathematically enforced.*

---

## 6. Sustainable Development Goals (SDG) Mapping
- **SDG 3:** Good Health and Well-being.
- **SDG 4:** Quality Education.
- **SDG 10:** Reduced Inequalities (supporting first-generation or struggling students).
- **SDG 16:** Strong Institutions.

---

## 7. System Structure & Demo Flow

### The MVP Scope
1. **Student Side (Anonymous Form):** Mobile-friendly web page with a stress slider, short text input, and optional course/department tags.
2. **Processing Layer:** Text cleaning, sensitive-data redaction, and model prediction storage using anonymized metadata.
3. **Intelligence Layer:** Aggregation by day/week/course, spike detection, semantic clustering, and alert generation.
4. **Staff Dashboard:** Department heatmap, top recurring issues, trend charts, and weekly GenAI summaries.

### User Journey (Demo Flow)
1. A student submits an anonymous stress note.
2. The ML model tags it as workload stress and assigns urgency (Low/Medium/High).
3. The dashboard shows a rising trend in stress for that specific course or batch.
4. GenAI generates a concise campus summary report for the week.
5. A teacher or administrator marks an intervention, such as moving an assignment deadline, and tracks if stress drops afterward.

---

## 8. Data Science & Model Architecture

### Recommended Model Stack & Implementation Pipeline
The project follows a phased ML implementation pipeline evaluated via F1-scores and confusion matrices:
- **Phase 1 (Baseline):** TF-IDF vectorization with Logistic Regression / SVM.
- **Phase 2 (Deep Learning):** TF-IDF or Dense Embeddings fed into a Multi-Layer Perceptron (MLP).
- **Phase 3 (Clustering):** BERTopic or K-means on pgvector embeddings for campus-wide insights and trend detection.

### Where the MLP Fits (Deep Dive)
The Multi-Layer Perceptron (MLP) is ideal after preprocessing because it learns non-linear relationships in the text-derived features that linear models miss.

**StressLens MLP Architecture (`models.py`):**
- **Input Layer:** Dense Sentence Embeddings (384-dimensional) or TF-IDF vectors.
- **Hidden Layers:** A funnel architecture (`256 -> 128 -> 64` neurons) using modern **GELU/ReLU activations**.
- **Regularization:** Batch Normalization, Dropout (0.2-0.3), and Early Stopping to prevent overfitting on sparse text.
- **Output Layer:** Softmax for multi-class stress type (Low/Medium/High).
- **Optimizer & Loss:** Adam optimizer with Categorical Cross-Entropy loss.

### Experiment Tracking
**MLflow** tracks the pipeline from the baseline Logistic Regression up to the PyTorch MLP, logging hyperparameters, precision-recall curves, and ensuring seamless promotion of the best-performing models to the Celery worker queue.

---

## 9. Quick Start & Setup

### Docker (Recommended)
Spin up the entire stack—PostgreSQL (w/ pgvector), Redis, Celery workers, API Gateway, and Web UI:
```bash
docker compose up --build
```
- **Frontend Dashboard:** `http://localhost:3000`
- **FastAPI Backend:** `http://localhost:8000`
- **Swagger Docs:** `http://localhost:8000/docs`

### Local Manual Development
**1. Database & Environment**
```bash
cd apps/api
cp .env.example .env
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
```

**2. API Gateway & ML Celery Workers**
```bash
uvicorn app.main:app --reload --port 8000
# In a new terminal:
celery -A app.ml.celery_app worker --loglevel=info -Q ml,celery
```

**3. Next.js Web Client**
```bash
cd apps/web
npm install
npm run dev
```

**4. MLflow UI**
```bash
cd apps/api
mlflow ui --backend-store-uri sqlite:///mlflow.db
```
