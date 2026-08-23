#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Namespaced so an ambient API_PORT (e.g. from another project) can't clobber us.
API_PORT="${CLIENTOPS_API_PORT:-18080}"
FE_HOST="${CLIENTOPS_FE_HOST:-127.0.0.1}"
FE_PORT="${CLIENTOPS_FE_PORT:-5173}"

echo "== ClientOps dev: API :$API_PORT / web :$FE_PORT =="

# 1. .env bootstrap
if [ ! -f .env ]; then cp .env.example .env; fi
# Give the seeded admin a sane password instead of the committed placeholder.
# ponytail: BSD sed (-i ''); GNU sed would need `sed -i` without the empty arg.
if grep -q '^ADMIN_PASSWORD=replace-with-a-long-unique-password$' .env; then
  sed -i '' 's/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD=clientops-admin-2026/' .env
fi

# 2. Frontend deps
[ -d frontend/node_modules ] || (cd frontend && npm install)

# 3. Backend stack. e2e override drops host ports for postgres/redis/minio so we
#    never fight another local postgres/redis on 5432/6379/9000.
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.e2e.yml)
API_PORT="$API_PORT" "${COMPOSE[@]}" up -d --build

# 4. Schema + seed (both idempotent)
API_PORT="$API_PORT" "${COMPOSE[@]}" run --rm migrate
API_PORT="$API_PORT" "${COMPOSE[@]}" run --rm seed

# 5. Serve frontend, proxying /api -> backend
cd frontend
echo ""
echo "== ClientOps ready =="
echo "   web   http://${FE_HOST}:${FE_PORT}"
echo "   api   http://localhost:${API_PORT}"
echo "   login admin@example.com / clientops-admin-2026"
echo ""
VITE_API_PROXY_TARGET="http://127.0.0.1:${API_PORT}" npm run dev -- --host "$FE_HOST" --port "$FE_PORT"
