# ================================
# Stage 1: Build Frontend
# ================================
FROM node:20.13.1-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps

COPY frontend/ ./
RUN npm run build

# ================================
# Stage 2: Backend Runtime
# ================================
FROM python:3.12.3-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000 \
    ENVIRONMENT=production

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    libreoffice \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-core \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY app/ ./app/

# Copy frontend build artifacts
COPY --from=frontend-builder /app/frontend/dist ./app/dist

# Create unprivileged user
RUN useradd -m appuser

# Create all required directories with proper permissions
# Do this BEFORE switching to appuser
RUN mkdir -p \
    /app/uploads/avatars \
    /app/app/raw \
    /app/app/cleaned \
    /app/app/charts \
    /app/app/models \
    /app/app/tmp \
    /app/app/stash \
    && chown -R appuser:appuser /app

# Switch to unprivileged user
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
