#!/bin/bash
# Production start script for FastAPI backend
# Port is typically provided by the environment (e.g. Render/Railway)

PORT=${PORT:-8000}
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:$PORT \
  --log-level info
