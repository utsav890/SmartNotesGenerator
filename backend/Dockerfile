# ==============================================================================
# SmartNotes AI - Backend Dockerfile
# Optimized for FastAPI, Google Gemini AI, Sentence Transformers, and SQLAlchemy
# ==============================================================================
FROM python:3.11-slim

# Prevent Python from writing pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production

WORKDIR /app

# Install system dependencies (FFmpeg supports audio/video stream extraction if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    gcc \
    g++ \
    curl \
    libmariadb-dev-compat \
    libmariadb-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY app/ ./app/
COPY migrations/ ./migrations/
COPY run_local.py .

# Expose FastAPI default port
EXPOSE 8000

# Start Uvicorn production server (with runtime secret generation if unset)
CMD ["sh", "-c", "if [ -z \"$JWT_SECRET\" ]; then export JWT_SECRET=$(python -c 'import secrets; print(secrets.token_urlsafe(48))'); fi; exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"]

