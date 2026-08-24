#!/usr/bin/env bash
# StressLens API - Runner script
set -e

case "$1" in
  dev)
    uvicorn app.main:app --reload --host 0.0.0.0 --port "${PORT:-8000}"
    ;;
  start)
    uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
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
    echo "Usage: $0 {dev|start|worker|beat|migrate|train}"
    exit 1
esac

