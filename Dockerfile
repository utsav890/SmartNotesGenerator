# ==============================================================================
# SmartNotes AI - Google Cloud Run Unified Production Dockerfile
# Builds React Frontend SPA + FastAPI Backend into a Single Production Container
# ==============================================================================

# --------------------------------------------------
# Stage 1: Build React Frontend SPA
# --------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /build

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
ENV VITE_API_BASE_URL=""
RUN npm run build

# --------------------------------------------------
# Stage 2: Production Python Backend Runner
# --------------------------------------------------
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    PORT=8000

WORKDIR /app

# Install system dependencies (FFmpeg is mandatory for Whisper audio transcription)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    gcc \
    g++ \
    curl \
    libmariadb-dev-compat \
    libmariadb-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application source code
COPY backend/app/ ./app/
COPY backend/migrations/ ./migrations/
COPY backend/run_local.py .
COPY docker-entrypoint.sh /app/docker-entrypoint.sh

# Normalize line endings and grant execute permissions for entrypoint
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# Copy built frontend SPA assets from Stage 1 into /app/static
COPY --from=frontend-builder /build/dist ./static

# Cloud Run container port default (8000)
EXPOSE 8000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

