# -------------------------------
# Stage 1: Build Frontend (React + Vite)
# -------------------------------
FROM node:18-slim AS frontend-builder

# Set working directory inside frontend
WORKDIR /app/frontend

# Copy only package files first to leverage Docker cache
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy full frontend source
COPY frontend/ ./

# Build production frontend
RUN npm run build

# Optional: confirm build output
RUN ls -la /app/app/dist

# -------------------------------
# Stage 2: Python Runtime
# -------------------------------
FROM python:3.11-slim

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000

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

# Copy Python requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY app/ ./app/

# Copy frontend build from builder stage
COPY --from=frontend-builder /app/app/dist ./dist

# Create necessary directories
RUN mkdir -p /app/uploads /app/app/raw /app/app/cleaned /app/app/charts /app/app/models

# Set permissions
RUN chmod -R 755 /app

# Expose port
EXPOSE 8000

# Healthcheck endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Run FastAPI app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
