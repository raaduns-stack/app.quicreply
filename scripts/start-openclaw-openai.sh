#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/Users/azam/Documents/Codes/client/app.quicreply"
OPENCLAW_DIR="/Users/azam/Documents/Codes/client/openclaw"
OPENCLAW_STATE_DIR="/Users/azam/Documents/Codes/client/openclaw-state-quicreply"
ENV_FILE="$ROOT_DIR/config/openclaw-openai.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  echo "Copy config/openclaw-openai.env.example to config/openclaw-openai.env and paste your OpenAI key."
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

if [[ -z "${OPENAI_API_KEY:-}" || "${OPENAI_API_KEY}" == "PASTE_YOUR_OPENAI_API_KEY_HERE" ]]; then
  echo "OPENAI_API_KEY is not set in $ENV_FILE"
  exit 1
fi

cd "$OPENCLAW_DIR"

env \
  OPENCLAW_CONFIG_PATH="$OPENCLAW_STATE_DIR/openclaw.json" \
  OPENCLAW_STATE_DIR="$OPENCLAW_STATE_DIR" \
  OPENCLAW_HOME="$OPENCLAW_STATE_DIR" \
  OPENCLAW_SKIP_CHANNELS=1 \
  OPENAI_API_KEY="$OPENAI_API_KEY" \
  /usr/local/bin/node "$OPENCLAW_DIR/openclaw.mjs" gateway run \
  --port 18789 \
  --bind loopback \
  --allow-unconfigured \
  --token qr-local-openclaw-token-20260607
