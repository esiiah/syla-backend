FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1

# Install system dependencies (LibreOffice + Ghostscript + qpdf + fonts)
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       libreoffice \
       libreoffice-writer \
       libreoffice-calc \
       libreoffice-impress \
       ghostscript \
       qpdf \
       poppler-utils \
       fonts-dejavu-core \
       libxrender1 \
       libxext6 \
       libfontconfig1 \
       libglu1-mesa \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for caching
COPY requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy source code
COPY . /app

EXPOSE 8000

# Start FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
