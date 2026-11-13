#!/usr/bin/env bash
# Runs on the server (uploaded by deploy.sh): swaps `current` to a release, restarts, checks health, rolls back on any failure.
# Usage: remote-activate.sh <release-dir>      Env: BASE (default /srv/guates/store), SERVICE, HEALTH_TRIES, HEALTH_WAIT
set -uo pipefail

RELEASE="${1:?release dir required}"
BASE="${BASE:-/srv/guates/store}"
SERVICE="${SERVICE:-guates-store}"
TRIES="${HEALTH_TRIES:-10}"
WAIT="${HEALTH_WAIT:-2}"
ENV_FILE="$BASE/shared/store.env"

fail() { echo "deploy: $*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || fail "missing $ENV_FILE"
# Ignore comments, quotes and whitespace so the value matches what systemd hands the app.
PORT="$(grep -E '^[[:space:]]*PORT=' "$ENV_FILE" | tail -1 | sed -E 's/#.*//; s/^[^=]*=//; s/^[[:space:]"'\'']+//; s/[[:space:]"'\'']+$//')"
[[ "$PORT" =~ ^[0-9]+$ ]] || fail "PORT in $ENV_FILE is missing or not a number"
systemctl cat "$SERVICE" >/dev/null 2>&1 || fail "unit $SERVICE is not installed"
systemctl is-enabled "$SERVICE" >/dev/null 2>&1 || fail "unit $SERVICE is not enabled (systemctl enable $SERVICE)"

PREVIOUS=""
[ -L "$BASE/current" ] && PREVIOUS="$(readlink -f "$BASE/current")"

point_current() { ln -sfn "$1" "$BASE/current.new" && mv -Tf "$BASE/current.new" "$BASE/current"; }

healthy() {
  local i
  for ((i = 0; i < TRIES; i++)); do
    sleep "$WAIT"
    curl -fsS -m 5 "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1 && return 0
  done
  return 1
}

if point_current "$RELEASE" && systemctl restart "$SERVICE" && healthy; then
  echo "deploy: $RELEASE is healthy on port $PORT"
  exit 0
fi

echo "deploy: activation of $RELEASE failed" >&2
if [ -z "$PREVIOUS" ]; then
  systemctl stop "$SERVICE" || true
  rm -f "$BASE/current"
  fail "first deploy failed; no previous release, service left stopped (see: journalctl -u $SERVICE)"
fi
point_current "$PREVIOUS" && systemctl restart "$SERVICE" || true
if healthy; then
  fail "rolled back to $PREVIOUS and it is healthy"
fi
fail "rolled back to $PREVIOUS but it is NOT healthy; check journalctl -u $SERVICE"
