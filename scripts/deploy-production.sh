#!/usr/bin/env bash

set -Eeuo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
REPO_BRANCH="${REPO_BRANCH:-main}"
SKIP_PULL="${SKIP_PULL:-false}"
APP_PORT="${APP_PORT:-3002}"

if [[ "${1:-}" == "--skip-pull" ]]; then
  SKIP_PULL="true"
fi

cd "$REPO_ROOT"

if [[ ! -f ".env.server" ]]; then
  echo "ERROR: .env.server is missing"
  exit 1
fi

if command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE_CMD="docker compose"
else
  echo "ERROR: docker-compose/docker compose is not available"
  exit 1
fi

echo "==> Deploying branch: $REPO_BRANCH"
echo "==> Repo root: $REPO_ROOT"
echo "==> Compose command: $DOCKER_COMPOSE_CMD"

if [[ "$SKIP_PULL" != "true" ]]; then
  echo "==> Fetching latest code from origin/$REPO_BRANCH"
  git fetch origin "$REPO_BRANCH"
  git checkout "$REPO_BRANCH"
  git pull --ff-only origin "$REPO_BRANCH"
fi

echo "==> Building Wasp output"
wasp build

if $DOCKER_COMPOSE_CMD config --services | grep -qx "opensaas-client"; then
  echo "==> Building frontend assets"

  FRONTEND_API_URL="${FRONTEND_API_URL:-https://api.quicreply.io}"

  REACT_APP_API_URL="$FRONTEND_API_URL" npx vite build

  [[ -f .wasp/out/web-app/build/index.html ]] || {
    echo "ERROR: Frontend build output missing"
    exit 1
  }
fi

if $DOCKER_COMPOSE_CMD config --services | grep -qx "opensaas-client"; then
  if [[ -f ".wasp/out/web-app/build/index.html" ]]; then
    echo "==> Deploying app and static client containers"
    $DOCKER_COMPOSE_CMD up -d --build opensaas-app opensaas-client
  else
    echo "==> Static client build not found, deploying backend app container only"
    $DOCKER_COMPOSE_CMD up -d --build opensaas-app
  fi
else
  echo "==> Deploying app container"
  $DOCKER_COMPOSE_CMD up -d --build opensaas-app
fi

if command -v curl >/dev/null 2>&1; then
  echo "==> Waiting for app health check"
  APP_HEALTH_URL="http://127.0.0.1:${APP_PORT}"
  APP_HEALTH_ATTEMPTS="${APP_HEALTH_ATTEMPTS:-24}"
  APP_HEALTH_INTERVAL_SECONDS="${APP_HEALTH_INTERVAL_SECONDS:-5}"

  app_is_healthy="false"
  for ((attempt = 1; attempt <= APP_HEALTH_ATTEMPTS; attempt += 1)); do
    if curl -fsS --max-time 5 "$APP_HEALTH_URL" >/dev/null; then
      app_is_healthy="true"
      break
    fi

    echo "==> App health check attempt ${attempt}/${APP_HEALTH_ATTEMPTS} failed; retrying"
    sleep "$APP_HEALTH_INTERVAL_SECONDS"
  done

  if [[ "$app_is_healthy" != "true" ]]; then
    echo "ERROR: Health check failed on $APP_HEALTH_URL"
    $DOCKER_COMPOSE_CMD logs --tail=100 opensaas-app
    exit 1
  fi
else
  echo "==> curl not found, skipping HTTP health check"
fi

echo "==> Current containers"
$DOCKER_COMPOSE_CMD ps

echo "==> Recent app logs"
$DOCKER_COMPOSE_CMD logs --tail=50 opensaas-app
