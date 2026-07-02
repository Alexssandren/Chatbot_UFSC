#!/bin/bash
set -euo pipefail

REPO="https://github.com/Alexssandren/Chatbot_UFSC.git"
REF="master"
TMP="/tmp/validacert-deploy-$$"

cleanup() {
  rm -rf "$TMP"
}
trap cleanup EXIT

rm -rf "$TMP"
git clone --depth 1 --branch "$REF" "$REPO" "$TMP"

sync_code() {
  local target="$1"
  mkdir -p "$target"
  rsync -a --delete \
    --exclude '.env' \
    --exclude 'node_modules' \
    --exclude 'backend/dev.db' \
    --exclude 'backend/uploads' \
    --exclude '.git' \
    "$TMP/" "$target/"
}

write_compose_prod() {
  cat > /opt/validacert/docker-compose.yml <<'YAML'
name: validacert

services:
  backend:
    build:
      context: ./backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: file:/app/data/dev.db
      UPLOAD_DIR: /app/uploads
      SESSION_SECRET: ${SESSION_SECRET:-validacert-production-session-secret-change-me-2026}
      SESSION_COOKIE_SECURE: ${SESSION_COOKIE_SECURE:-false}
      CORS_ORIGIN: ${CORS_ORIGIN:-http://207.58.153.22:8083}
      MAIL_ENABLED: ${MAIL_ENABLED:-false}
      SMTP_HOST: ${SMTP_HOST:-}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_SECURE: ${SMTP_SECURE:-false}
      SMTP_USER: ${SMTP_USER:-}
      SMTP_PASS: ${SMTP_PASS:-}
      MAIL_FROM: ${MAIL_FROM:-}
    volumes:
      - db_data:/app/data
      - upload_data:/app/uploads
    expose:
      - "3001"
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 5
      start_period: 20s

  frontend:
    build:
      context: ./frontend
    restart: unless-stopped
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - "8083:80"

volumes:
  db_data:
  upload_data:
YAML
}

write_compose_dev() {
  cat > /opt/validacert.dev/docker-compose.yml <<'YAML'
name: validacert-devtest

services:
  backend:
    build:
      context: ./backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: file:/app/data/dev.db
      UPLOAD_DIR: /app/uploads
      SESSION_SECRET: ${SESSION_SECRET:-validacert-production-session-secret-change-me-2026}
      SESSION_COOKIE_SECURE: ${SESSION_COOKIE_SECURE:-false}
      CORS_ORIGIN: ${CORS_ORIGIN:-http://207.58.153.22:8084}
      MAIL_ENABLED: ${MAIL_ENABLED:-false}
      SMTP_HOST: ${SMTP_HOST:-}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_SECURE: ${SMTP_SECURE:-false}
      SMTP_USER: ${SMTP_USER:-}
      SMTP_PASS: ${SMTP_PASS:-}
      MAIL_FROM: ${MAIL_FROM:-}
    volumes:
      - db_data:/app/data
      - upload_data:/app/uploads
    expose:
      - "3001"
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 5
      start_period: 20s

  frontend:
    build:
      context: ./frontend
    restart: unless-stopped
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - "8084:80"

volumes:
  db_data:
  upload_data:
YAML
}

echo "[1/4] Deploy dev /opt/validacert.dev"
sync_code /opt/validacert.dev
write_compose_dev
if [ -f /opt/validacert.dev/.env ]; then
  sed -i 's|CORS_ORIGIN=.*|CORS_ORIGIN=http://207.58.153.22:8084|' /opt/validacert.dev/.env
fi
cd /opt/validacert.dev
docker compose up -d --build

echo "[2/4] Deploy producao /opt/validacert"
sync_code /opt/validacert
write_compose_prod
if [ -f /opt/validacert/.env ]; then
  sed -i 's|CORS_ORIGIN=.*|CORS_ORIGIN=http://207.58.153.22:8083|' /opt/validacert/.env
fi
cd /opt/validacert
docker compose up -d --build

echo "[3/4] Aguardando healthchecks"
sleep 30
docker ps --format '{{.Names}} | {{.Status}} | {{.Ports}}' | grep -E 'validacert|devtest' || true

echo "[4/4] Smoke tests"
curl -fsS http://127.0.0.1:8083/ >/dev/null && echo "frontend 8083 OK" || echo "frontend 8083 FAIL"
curl -fsS http://127.0.0.1:8084/ >/dev/null && echo "frontend 8084 OK" || echo "frontend 8084 FAIL"
docker exec validacert-backend-1 node -e "fetch('http://127.0.0.1:3001/health').then(r=>r.json()).then(j=>{if(j.status!=='ok')process.exit(1)}).catch(()=>process.exit(1))" && echo "backend prod health OK"
docker exec validacert-devtest-backend-1 node -e "fetch('http://127.0.0.1:3001/health').then(r=>r.json()).then(j=>{if(j.status!=='ok')process.exit(1)}).catch(()=>process.exit(1))" && echo "backend dev health OK"

echo "DEPLOY_OK"
