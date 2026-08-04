"""
StressLens API - Makefile-equivalent shell scripts
"""
#!/usr/bin/env bash
set -e

case "$1" in
  dev)
    uvicorn app.main:app --reload --port 8000
    ;;
  worker)
    celery -A app.ml.celery_app worker --loglevel=info -Q ml,celery
    ;;
  beat)
    celery -A app.ml.celery_app beat --loglevel=info
    ;;
  migrate)
    alembic upgrade head
    ;;
  train)
    python scripts/train.py
    ;;
  *)
    echo "Usage: $0 {dev|worker|beat|migrate|train}"
    exit 1
esac
