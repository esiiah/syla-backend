# Dockerfile
# Stage 1: Build Frontend
# ================================
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm config set update-notifier false && \
    npm ci --legacy-peer-deps

COPY frontend/ ./

# Pass environment variables to build
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_GOOGLE_CLIENT_ID

ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Clean any existing dist before building
RUN rm -rf dist && npm run build

# ================================
# Stage 2: Backend Runtime
# ================================
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_ROOT_USER_ACTION=ignore \
    DEBIAN_FRONTEND=noninteractive \
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

# Copy Firebase service account (add after COPY app/ ./app/)
COPY firebase-service-account.json /app/firebase-service-account.json

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
    && chown -R appuser:appuser /app /app/firebase-service-account.json

# Switch to unprivileged user
USER appuser

# ✅ Changed to port 8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# ✅ Changed to port 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "4"]
# ================================