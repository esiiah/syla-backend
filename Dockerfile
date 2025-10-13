# ================================
# Stage 1: Build Frontend
# ================================
FROM node:20.13.1-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps

COPY frontend/ ./

# Clean any existing dist before building
RUN rm -rf dist && npm run build

# ================================
# Stage 2: Backend Runtime
# ================================
FROM python:3.12.3-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8080 \
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

# Copy frontend build artifacts (clean copy)
COPY --from=frontend-builder /app/frontend/dist ./app/dist

# Create unprivileged user FIRST
RUN useradd -m -u 1000 appuser

# Create all required directories with proper permissions
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

# ✅ Changed to port 8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# ✅ Changed to port 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "4"]
