#!/usr/bin/env bash
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K6_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RESULTS_DIR="$K6_DIR/results"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

BASELINE_VUS="${BASELINE_VUS:-10}"
BASELINE_DURATION="${BASELINE_DURATION:-5m}"
STRESS_VUS="${STRESS_VUS:-100}"
STRESS_DURATION="${STRESS_DURATION:-10m}"
SPIKE_VUS="${SPIKE_VUS:-1000}"
SPIKE_DURATION="${SPIKE_DURATION:-5m}"

# Track overall exit code
EXIT_CODE=0

run_phase() {
  local phase="$1"
  local vus="$2"
  local duration="$3"

  local summary_file="$RESULTS_DIR/${TIMESTAMP}_${phase}_summary.json"
  local log_file="$RESULTS_DIR/${TIMESTAMP}_${phase}.log"

  echo "=== Running ${phase} (VUS=${vus}, DURATION=${duration}) ==="
  (
    cd "$K6_DIR"
    VUS="$vus" DURATION="$duration" \
      k6 run main.js --summary-export "$summary_file"
  ) 2>&1 | tee "$log_file"
  local rc=${PIPESTATUS[0]}

  echo "Saved: $summary_file"
  echo "Saved: $log_file"

  if [ $rc -ne 0 ]; then
    echo "⚠️  Phase ${phase} exited with code $rc"
    EXIT_CODE=$rc
  fi
}

mkdir -p "$RESULTS_DIR"

run_phase "baseline" "$BASELINE_VUS" "$BASELINE_DURATION"
run_phase "stress" "$STRESS_VUS" "$STRESS_DURATION"
run_phase "spike" "$SPIKE_VUS" "$SPIKE_DURATION"

echo "=== Completed all phases ==="
echo "Results directory: $RESULTS_DIR"

# Always run cleanup, even if tests failed
echo ""
echo "Running post-test cleanup..."
"$K6_DIR/cleanup-perf-tests.sh" || true

exit $EXIT_CODE
