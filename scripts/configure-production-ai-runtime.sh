#!/usr/bin/env bash

set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root."
  exit 1
fi

SECRET_DIR="${SECRET_DIR:-/opt/stack/quicreply-ai-secrets}"
OPENCLAW_ENV="${OPENCLAW_ENV:-/opt/openclaw/.env}"
N8N_ENV="${N8N_ENV:-/opt/stack/quicreply-n8n-runtime.env}"
APP_ENV="${APP_ENV:-/var/www/quicreply_io_usr/data/www/app.quicreply.io/.env.server}"

install -d -m 700 "$SECRET_DIR"

ensure_secret() {
  local path="$1"
  if [[ ! -s "$path" ]]; then
    umask 077
    openssl rand -hex 32 > "$path"
  fi
  chmod 600 "$path"
}

upsert_env() {
  local file="$1"
  local key="$2"
  local value="$3"
  local owner="0:0"
  local tmp

  if [[ -e "$file" ]]; then
    owner="$(stat -c '%u:%g' "$file")"
  fi

  tmp="$(mktemp)"
  if [[ -f "$file" ]]; then
    grep -v "^${key}=" "$file" > "$tmp" || true
  fi
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  install -o "${owner%:*}" -g "${owner#*:}" -m 600 "$tmp" "$file"
  rm -f "$tmp"
}

ensure_secret "$SECRET_DIR/openclaw-gateway-token"
ensure_secret "$SECRET_DIR/n8n-whatsapp-router-secret"
ensure_secret "$SECRET_DIR/n8n-whatsapp-reply-secret"
ensure_secret "$SECRET_DIR/n8n-ai-test-secret"

openclaw_token="$(tr -d '\r\n' < "$SECRET_DIR/openclaw-gateway-token")"
router_secret="$(tr -d '\r\n' < "$SECRET_DIR/n8n-whatsapp-router-secret")"
reply_secret="$(tr -d '\r\n' < "$SECRET_DIR/n8n-whatsapp-reply-secret")"
ai_test_secret="$(tr -d '\r\n' < "$SECRET_DIR/n8n-ai-test-secret")"

upsert_env "$OPENCLAW_ENV" OPENCLAW_GATEWAY_TOKEN "$openclaw_token"

install -o root -g root -m 600 /dev/null "$N8N_ENV"
upsert_env "$N8N_ENV" N8N_HOST n8n.quicreply.io
upsert_env "$N8N_ENV" N8N_PROTOCOL https
upsert_env "$N8N_ENV" WEBHOOK_URL https://n8n.quicreply.io/
upsert_env "$N8N_ENV" N8N_TRUST_PROXY true
upsert_env "$N8N_ENV" N8N_PORT 5678
upsert_env "$N8N_ENV" N8N_BLOCK_ENV_ACCESS_IN_NODE false
upsert_env "$N8N_ENV" OPENCLAW_BASE_URL http://host.docker.internal:18789
upsert_env "$N8N_ENV" OPENCLAW_GATEWAY_TOKEN "$openclaw_token"
upsert_env "$N8N_ENV" OPENCLAW_INBOX_MODEL openclaw/ai-test
upsert_env "$N8N_ENV" OPENCLAW_AI_TEST_MODEL openclaw/ai-test
upsert_env "$N8N_ENV" N8N_WHATSAPP_ROUTER_SECRET "$router_secret"
upsert_env "$N8N_ENV" N8N_WHATSAPP_REPLY_SECRET "$reply_secret"
upsert_env "$N8N_ENV" N8N_AI_TEST_WEBHOOK_SECRET "$ai_test_secret"

if [[ -n "${ROUTER_URL:-}" ]]; then
  upsert_env "$APP_ENV" N8N_WHATSAPP_ROUTER_WEBHOOK_URL "$ROUTER_URL"
  upsert_env "$APP_ENV" N8N_WHATSAPP_ROUTER_SECRET "$router_secret"
  upsert_env "$APP_ENV" N8N_WHATSAPP_REPLY_SECRET "$reply_secret"
  upsert_env "$APP_ENV" N8N_AI_TEST_WEBHOOK_SECRET "$ai_test_secret"
fi

unset openclaw_token router_secret reply_secret ai_test_secret
echo "Production AI runtime environment prepared without printing secrets."
