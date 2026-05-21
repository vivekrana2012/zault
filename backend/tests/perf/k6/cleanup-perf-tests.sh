#!/bin/bash

# Performance Test Cleanup Script
# Removes test users and their database files after performance testing
# Usage: ./cleanup-perf-tests.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
USERS_DB_DIR="$BACKEND_DIR/data/users"
MAIN_DB="$BACKEND_DIR/data/zault.db"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "🧹 Starting Performance Test Cleanup..."
echo ""

# Check if sqlite3 is available
if ! command -v sqlite3 &> /dev/null; then
  echo -e "${RED}❌ sqlite3 not found. Cannot perform cleanup.${NC}"
  exit 1
fi

if [ ! -f "$MAIN_DB" ]; then
  echo -e "${YELLOW}⚠️  Main database not found: $MAIN_DB${NC}"
  exit 1
fi

# Find all perf users directly from the database (username starts with "perfuser")
echo "📋 Querying database for performance test users (perfuser%)..."
PERF_USERS=$(sqlite3 "$MAIN_DB" "SELECT id || '|' || username FROM users WHERE username LIKE 'perfuser%';" 2>/dev/null)
USER_COUNT=$(echo "$PERF_USERS" | grep -c '.' 2>/dev/null || echo "0")

if [ -z "$PERF_USERS" ]; then
  echo -e "${YELLOW}⚠️  No performance test users found in database.${NC}"
  echo ""
  exit 0
fi

echo "   Found $USER_COUNT perf test users in database"
echo ""

# Step 1: Remove per-user database directories
echo "🗑️  Removing perf user database files..."
while IFS='|' read -r USER_ID username; do
  # New dir structure: users/{char1-2}/{char3-4}/{uuid}/{uuid}.db
  PREFIX1="${USER_ID:0:2}"
  PREFIX2="${USER_ID:2:2}"
  USER_DB_DIR="$USERS_DB_DIR/$PREFIX1/$PREFIX2/$USER_ID"
  if [ -d "$USER_DB_DIR" ]; then
    rm -rf "$USER_DB_DIR"
  fi
  # Remove parent dirs if empty
  rmdir "$USERS_DB_DIR/$PREFIX1/$PREFIX2" 2>/dev/null || true
  rmdir "$USERS_DB_DIR/$PREFIX1" 2>/dev/null || true
  echo -e "  ${GREEN}✓${NC} Removed db files for: $username ($USER_ID)"
done <<< "$PERF_USERS"

# Step 2: Delete all perf users from main database
sqlite3 "$MAIN_DB" "DELETE FROM users WHERE username LIKE 'perfuser%';" 2>/dev/null
DELETED_COUNT=$USER_COUNT

echo ""
echo -e "${GREEN}✅ Cleanup complete: $DELETED_COUNT users removed${NC}"
REMAINING=$(sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM users;" 2>/dev/null)
echo "   Remaining users in database: $REMAINING"
echo ""
