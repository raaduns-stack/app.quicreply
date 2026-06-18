#!/usr/bin/env bash

set -Eeuo pipefail

ROUTER_URL="${1:?Usage: check-production-ai-runtime.sh <router-webhook-url>}"
SECRET_FILE="${SECRET_FILE:-/opt/stack/quicreply-ai-secrets/n8n-whatsapp-router-secret}"

router_secret="$(tr -d '\r\n' < "$SECRET_FILE")"
response="$(curl -fsS --max-time 15 \
  -H 'Content-Type: application/json' \
  -H "x-quicreply-webhook-secret: ${router_secret}" \
  --data '{"event":"runtime.health"}' \
  "$ROUTER_URL")"
unset router_secret

printf '%s\n' "$response"
