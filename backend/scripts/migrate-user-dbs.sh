#!/usr/bin/env bash
# Migrates existing flat user DB files (uuid.db) to the new sharded directory structure:
#   data/users/xx/xx/uuid/user.db
#
# Safe to run multiple times — skips already-migrated users.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DATA_DIR="${ZAULT_USER_DB_DIR:-$PROJECT_ROOT/data/users}"

if [ ! -d "$DATA_DIR" ]; then
    echo "ERROR: Data directory not found: $DATA_DIR"
    exit 1
fi

migrated=0
skipped=0
failed=0

# Find all flat .db files matching UUID pattern (skip .template-user.db and WAL/SHM files)
for db_file in "$DATA_DIR"/*.db; do
    [ -f "$db_file" ] || continue

    filename=$(basename "$db_file")

    # Skip non-UUID files (template, etc.)
    if [[ ! "$filename" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.db$ ]]; then
        continue
    fi

    uuid="${filename%.db}"
    hex="${uuid//-/}"

    # 2-level shard: first 2 hex chars / next 2 hex chars / uuid / user.db
    shard1="${hex:0:2}"
    shard2="${hex:2:2}"
    target_dir="$DATA_DIR/$shard1/$shard2/$uuid"
    target_file="$target_dir/$uuid.db"

    if [ -f "$target_file" ]; then
        skipped=$((skipped + 1))
        continue
    fi

    mkdir -p "$target_dir"

    # Move the main .db file
    if mv "$db_file" "$target_file"; then
        # Also move WAL and SHM files if they exist
        [ -f "$db_file-wal" ] && mv "$db_file-wal" "$target_dir/$uuid.db-wal"
        [ -f "$db_file-shm" ] && mv "$db_file-shm" "$target_dir/$uuid.db-shm"
        migrated=$((migrated + 1))
        echo "  Migrated: $uuid -> $shard1/$shard2/$uuid/$uuid.db"
    else
        failed=$((failed + 1))
        echo "  FAILED:   $uuid"
    fi
done

echo ""
echo "Migration complete:"
echo "  Migrated: $migrated"
echo "  Skipped (already migrated): $skipped"
echo "  Failed: $failed"

if [ $failed -gt 0 ]; then
    exit 1
fi

