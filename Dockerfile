FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1

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
       unzip \
       curl \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY . /app

# make sure upload dirs exist
RUN mkdir -p /app/uploads /app/stash /app/tmp

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
