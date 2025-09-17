# Dockerfile
FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1

# Install system deps (LibreOffice + Ghostscript + qpdf + fonts & runtime libs)
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       libreoffice-writer libreoffice-core libreoffice-common \
       ghostscript qpdf poppler-utils \
       fonts-dejavu-core libxrender1 libxext6 libfontconfig1 libglu1-mesa \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only requirements first for better cache
COPY requirements.txt /app/requirements.txt

# Install python deps
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy app sources
COPY . /app

# Expose port (adjust if you use a different port variable)
EXPOSE 8000

# Start (adjust to your start command if different)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
