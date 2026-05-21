#!/usr/bin/env bash
# Creates the template-user.db file from user-schema.sql
# Run this script once before starting the application, or after schema changes.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SCHEMA_FILE="$PROJECT_ROOT/src/main/resources/user-schema.sql"
DATA_DIR="${ZAULT_USER_DB_DIR:-$PROJECT_ROOT/data/users}"
TEMPLATE_DB="$DATA_DIR/.template-user.db"

if [ ! -f "$SCHEMA_FILE" ]; then
    echo "ERROR: Schema file not found: $SCHEMA_FILE"
    exit 1
fi

mkdir -p "$DATA_DIR"

# Remove old template if it exists
rm -f "$TEMPLATE_DB"

# Create template DB with schema and pragmas
sqlite3 "$TEMPLATE_DB" <<EOF
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA foreign_keys=ON;
.read $SCHEMA_FILE
EOF

# Verify tables were created
TABLE_COUNT=$(sqlite3 "$TEMPLATE_DB" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")
echo "Template user DB created at: $TEMPLATE_DB"
echo "Tables: $TABLE_COUNT"
sqlite3 "$TEMPLATE_DB" "SELECT '  - ' || name FROM sqlite_master WHERE type='table' ORDER BY name;"

