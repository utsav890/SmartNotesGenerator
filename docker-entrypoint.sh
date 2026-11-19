#!/bin/sh
set -e

# If JWT_SECRET is not provided via environment or is empty, generate a cryptographically
# secure runtime secret (64 URL-safe characters = 48 bytes of CSPRNG entropy).
# This ensures strict production secret length (>= 32 chars) and prevents container startup crash
# when deployed to environments without a pre-configured JWT_SECRET secret variable.
if [ -z "$JWT_SECRET" ]; then
  echo "[entrypoint] NOTICE: No JWT_SECRET detected in environment. Generating cryptographically secure runtime key."
  export JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(48))")
fi

# Ensure PORT defaults to 8000 if unset (aligning with Cloud Run container port)
PORT="${PORT:-8000}"
export PORT

if [ "$#" -eq 0 ]; then
  echo "[entrypoint] Starting Uvicorn on 0.0.0.0:${PORT}..."
  exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --workers 1
fi

exec "$@"
