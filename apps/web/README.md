# StressLens

Anonymous stress monitoring platform for university students.

## Architecture

- **Frontend**: Next.js 16 (App Router) + Tailwind CSS v4
- **Backend**: FastAPI (async) + SQLAlchemy 2.0 + PostgreSQL with pgvector
- **ML Pipeline**: Celery + Redis + scikit-learn / sentence-transformers
- **Privacy**: Microsoft Presidio PII redaction + k-anonymity (threshold: 5)
- **DB Migrations**: Alembic (async)

## Quick Start (Docker)

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Local Development

### Backend
```bash
cd apps/api
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd apps/web
cp .env.local.example .env.local
npm install
npm run dev
```

### Celery Worker
```bash
cd apps/api
celery -A app.ml.celery_app worker --loglevel=info -Q ml,celery
```

### Database Migrations
```bash
cd apps/api
alembic upgrade head
```

## Environment Variables

See `apps/api/.env.example` for all backend env vars.

## Privacy Design

- Student text is PII-redacted via Microsoft Presidio before storage
- Course/Department identifiers are one-way hashed (SHA-256 + secret salt)
- Dashboard data only shown when group has ≥5 submissions (k-anonymity)
- No user accounts or session tracking
