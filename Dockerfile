# ================================
# Stage 1: Build Frontend
# ================================
FROM node:22.12-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps

COPY frontend/ ./
RUN npm run build

# ================================
# Stage 2: Backend Runtime
# ================================
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000 \
    ENVIRONMENT=production

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY app/ ./app/

# ❌ DO NOT copy .env into the image
# COPY app/.env ./.env  <-- removed

# Copy frontend build into backend dist folder
COPY --from=frontend-builder /app/frontend/dist ./app/dist

# Runtime dirs
RUN mkdir -p /app/uploads /app/app/raw /app/app/cleaned /app/app/charts /app/app/models

# Create unprivileged user
RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
