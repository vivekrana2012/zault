#!/usr/bin/env bash
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K6_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$K6_DIR"
k6 run scenarios/read.js "$@"
K6_EXIT=$?

# Always cleanup test users after run
echo ""
echo "Running post-test cleanup..."
"$K6_DIR/cleanup-perf-tests.sh" || true

exit $K6_EXIT
