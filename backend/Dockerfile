# Pithros backend image — multi-stage, non-root, no build toolchain in the runtime layer.

FROM python:3.14-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN apt-get update \
    && apt-get install --no-install-recommends -y build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY requirements.txt .

RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip \
    && /opt/venv/bin/pip install -r requirements.txt


FROM python:3.14-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

RUN apt-get update \
    && apt-get install --no-install-recommends -y libpq5 postgresql-client curl tesseract-ocr \
    && apt-get install --only-upgrade -y libpcre2-8-0 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 pithros \
    && useradd --system --uid 1001 --gid pithros --create-home pithros

COPY --from=builder /opt/venv /opt/venv

WORKDIR /app
COPY --chown=pithros:pithros . .

RUN chown pithros:pithros /app \
    && (chmod +x /app/scripts/*.sh 2>/dev/null || true)

USER pithros
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
