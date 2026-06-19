#!/bin/sh
# Railway mounts persistent volumes as root:root. Since the app runs as the
# non-root `appuser`, fix ownership of the DB directory (as root) before
# dropping privileges, otherwise SQLite cannot create the database file.
set -e

DATA_DIR="$(dirname "${DB_PATH:-/data/bisonplan.db}")"
mkdir -p "$DATA_DIR"
chown -R appuser:appuser "$DATA_DIR"

exec su-exec appuser "$@"
