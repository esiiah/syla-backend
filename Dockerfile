# Multi-stage Dockerfile for Syla Analytics (FastAPI + React)
# Supports amd64 and arm64 architectures

# ============================================================================
# Stage 1: Build Frontend (React + Vite)
# ============================================================================
FROM node:18-slim AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies with clean install
RUN npm ci --legacy-peer-deps

# Copy frontend source
COPY frontend/ ./

# Build production frontend (outputs to ../app/dist)
RUN npm run build

# ============================================================================
# Stage 2: Python Runtime
# ============================================================================
FROM python:3.12-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/app/dist ./app/dist

# Create necessary directories
RUN mkdir -p /app/uploads /app/app/raw /app/app/cleaned /app/app/charts /app/app/models

# Set proper permissions
RUN chmod -R 755 /app

# Expose port dynamically
EXPOSE ${PORT}

# Health check uses injected PORT
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Run the application
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
