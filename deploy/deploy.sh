#!/usr/bin/env bash
# Builds locally, uploads a new release, swaps `current`, restarts, checks health, rolls back on failure.
# Usage: deploy/deploy.sh   (SKIP_TESTS=1 to skip the test runs)
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-159.89.158.17}"
DEPLOY_USER="${DEPLOY_USER:-root}"
BASE=/srv/guates/store
SERVICE=guates-store
KEEP=5

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSH_TARGET="$DEPLOY_USER@$DEPLOY_HOST"
remote() { ssh "$SSH_TARGET" "$@"; }

if [ -z "${SKIP_TESTS:-}" ]; then
  (cd "$ROOT/ecommerce-prototype/server" && npm test)
  (cd "$ROOT/ecommerce-prototype/app" && npm test)
fi

# Build locally: the droplet is too small to run vite and the image scripts.
(cd "$ROOT/ecommerce-prototype/app" && npm ci && npm run build)

RELEASE="$BASE/releases/$(date +%Y%m%d%H%M%S)"
remote "mkdir -p '$RELEASE/server' '$RELEASE/app/dist'"
# No node_modules and no .env: the root .env never leaves this machine; config comes from shared/store.env.
rsync -az --delete -e ssh --exclude node_modules --exclude '.env' --exclude 'data/*.sqlite*' \
  "$ROOT/ecommerce-prototype/server/" "$SSH_TARGET:$RELEASE/server/"
rsync -az --delete -e ssh "$ROOT/ecommerce-prototype/app/dist/" "$SSH_TARGET:$RELEASE/app/dist/"
rsync -az -e ssh "$ROOT/deploy/backup.sh" "$SSH_TARGET:$BASE/shared/backup.sh"

# Production dependencies only, installed on the server so native/optional packages match its platform.
remote "cd '$RELEASE/server' && npm ci --omit=dev && chown -R guates:guates '$RELEASE' && chmod 755 '$BASE/shared/backup.sh' && chown guates:guates '$BASE/shared/backup.sh'"

PREVIOUS="$(remote "readlink -f '$BASE/current' || true")"
remote "ln -sfn '$RELEASE' '$BASE/current.new' && mv -Tf '$BASE/current.new' '$BASE/current' && systemctl restart $SERVICE"

PORT="$(remote "grep -E '^PORT=' '$BASE/shared/store.env' | cut -d= -f2 | tr -d '[:space:]'")"
healthy=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  sleep 2
  if remote "curl -fsS -m 5 http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then healthy=1; break; fi
done

if [ -z "$healthy" ]; then
  echo "Health check failed on $RELEASE" >&2
  if [ -n "$PREVIOUS" ]; then
    remote "ln -sfn '$PREVIOUS' '$BASE/current.new' && mv -Tf '$BASE/current.new' '$BASE/current' && systemctl restart $SERVICE"
    echo "Rolled back to $PREVIOUS" >&2
  else
    remote "systemctl stop $SERVICE"
  fi
  exit 1
fi

remote "cd '$BASE/releases' && ls -1dt */ | tail -n +$((KEEP + 1)) | grep -v \"^\$(basename \$(readlink -f '$BASE/current'))/\$\" | xargs -r rm -rf"
echo "Deployed $RELEASE"
