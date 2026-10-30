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
rsync -az --delete -e ssh --exclude node_modules --exclude '.env*' --exclude 'data/*.sqlite*' \
  "$ROOT/ecommerce-prototype/server/" "$SSH_TARGET:$RELEASE/server/"
rsync -az --delete -e ssh "$ROOT/ecommerce-prototype/app/dist/" "$SSH_TARGET:$RELEASE/app/dist/"

# Production dependencies only, installed on the server as `guates` so files and cache belong to the service user.
remote "chown -R guates:guates '$RELEASE' && cd '$RELEASE/server' && runuser -u guates -- env HOME=/srv/guates npm ci --omit=dev"
rsync -az -e ssh "$ROOT/deploy/backup.sh" "$SSH_TARGET:$BASE/shared/"
remote "chmod 755 '$BASE/shared/backup.sh' && chown guates:guates '$BASE/shared/backup.sh' && rm -f '$BASE/shared/remote-activate.sh'"

# Validation, swap, restart, health check and rollback all happen in one script, streamed from this machine:
# root never runs a file that the service user could have replaced.
ssh "$SSH_TARGET" bash -s -- "'$RELEASE'" < "$ROOT/deploy/remote-activate.sh"

remote "cd '$BASE/releases' && ls -1dt */ | tail -n +$((KEEP + 1)) | grep -v \"^\$(basename \$(readlink -f '$BASE/current'))/\$\" | xargs -r rm -rf"
echo "Deployed $RELEASE"
