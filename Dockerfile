# --- Stage 1: Base (Alpine) ---
FROM python:3.13-alpine AS python_base

ENV PYTHONUNBUFFERED=1
ENV UV_COMPILE_BYTECODE=1

WORKDIR /app

# --- Stage 2: Builder (install deps into .venv) ---
FROM python_base AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

COPY pyproject.toml uv.lock ./

RUN uv sync --frozen --no-install-project --no-dev

# --- Stage 3: Production (minimal runtime image) ---
FROM python_base AS prod

RUN addgroup -S appuser && adduser -S appuser -G appuser -h /app

# su-exec lets the entrypoint drop from root to appuser after fixing volume perms
RUN apk add --no-cache su-exec

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY backend ./backend
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"
ENV PORT=8000

# Run as root so the entrypoint can chown the mounted volume; it then exec's
# the server as appuser via su-exec.
EXPOSE 8000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
