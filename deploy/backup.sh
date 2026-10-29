#!/usr/bin/env bash
# Runs on the server as user guates. Cron: 15 3 * * * /srv/guates/store/shared/backup.sh
set -euo pipefail

SHARED=/srv/guates/store/shared
KEEP=14
DEST="$SHARED/backups/store-$(date +%F).db"
mkdir -p "$SHARED/backups"
rm -f "$DEST"

if command -v sqlite3 >/dev/null; then
  sqlite3 "$SHARED/store.db" ".backup '$DEST'"
else
  # The droplet has no sqlite3 CLI; Node's built-in backup API takes the same consistent snapshot.
  node --disable-warning=ExperimentalWarning -e '
    const { DatabaseSync, backup } = require("node:sqlite");
    const db = new DatabaseSync(process.argv[1]);
    backup(db, process.argv[2]).then(() => db.close());
  ' "$SHARED/store.db" "$DEST"
fi

ls -1t "$SHARED"/backups/store-*.db | tail -n +$((KEEP + 1)) | xargs -r rm -f
