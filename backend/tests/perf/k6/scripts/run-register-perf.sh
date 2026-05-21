#!/usr/bin/env bash
set -uo pipefail

# Registration Performance Test Runner
# Runs the registration-only k6 scenario then cleans up test users + DB files.
#
# Usage:
#   ./scripts/run-register-perf.sh
#   ./scripts/run-register-perf.sh --env BASE_URL=http://localhost:8080

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K6_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$K6_DIR"
k6 run scenarios/register.js "$@"
K6_EXIT=$?

# Always cleanup test users after run
echo ""
echo "Running post-test cleanup..."
"$K6_DIR/cleanup-perf-tests.sh" || true

exit $K6_EXIT

