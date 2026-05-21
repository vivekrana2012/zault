# k6 Manual Stress Suite

This folder contains a manually executable k6 stress suite for multi-user API load testing.

## What it covers

- Mixed default workload (`main.js`): upload + read + auth flows
- Dedicated workload scripts:
  - `scenarios/upload.js`
  - `scenarios/read.js`
  - `scenarios/auth.js`
- Multi-user setup with deterministic test users from `data/users.csv`
- Runtime generation of tradebook CSV payloads (no large fixture files in git)

## Prerequisites

- k6 installed (`k6 version`)
- Backend running and reachable by `BASE_URL`
- If backend only serves HTTPS with secure cookies, set `BASE_URL` to `https://...`

## Configuration

Copy `.env.example` to `.env` if you want local defaults, then export values in your shell.

```bash
cd /Users/viv/CascadeProjects/zault/backend/tests/perf/k6
set -a
source .env.example
set +a
```

## Run commands

Mixed (default):

```bash
cd /Users/viv/CascadeProjects/zault/backend/tests/perf/k6
./scripts/run-mixed.sh
```

Upload-heavy:

```bash
cd /Users/viv/CascadeProjects/zault/backend/tests/perf/k6
./scripts/run-upload.sh
```

Read-heavy:

```bash
cd /Users/viv/CascadeProjects/zault/backend/tests/perf/k6
./scripts/run-read.sh
```

Auth-only:

```bash
cd /Users/viv/CascadeProjects/zault/backend/tests/perf/k6
./scripts/run-auth.sh
```

Run baseline -> stress -> spike in one command:

```bash
cd /Users/viv/CascadeProjects/zault/backend/tests/perf/k6
./scripts/run-all.sh
```

Override phase settings when needed:

```bash
cd /Users/viv/CascadeProjects/zault/backend/tests/perf/k6
BASELINE_VUS=15 BASELINE_DURATION=5m \
STRESS_VUS=40 STRESS_DURATION=12m \
SPIKE_VUS=120 SPIKE_DURATION=4m \
./scripts/run-all.sh
```

## Custom run example

```bash
cd /Users/viv/CascadeProjects/zault/backend/tests/perf/k6
BASE_URL=http://localhost:8080 \
VUS=50 \
DURATION=15m \
TRADE_ROWS_PER_FILE=6000 \
MIXED_UPLOAD_PCT=35 \
MIXED_AUTH_PCT=15 \
./scripts/run-mixed.sh --summary-export=results/mixed_summary.json
```

## Optional: generate local CSV fixtures

This is optional because upload payloads are generated at runtime. Use this if you want repeatable static files for ad-hoc checks.

```bash
cd /Users/viv/CascadeProjects/zault/backend/tests/perf/k6
node ./scripts/generate-tradebooks.js ./data/generated 20 5000
```

## Notes

- The suite sends `X-API-Version` by default for `/api/**` routes.
- CSRF is primed through `/api/auth/me` after login, then `X-XSRF-TOKEN` is sent on write calls.
- Registration is idempotent in setup (`201` or `409` accepted).
- `USERS_CSV` path is resolved from the `lib/` module context; default is `../data/users.csv`.
- `run-all.sh` writes both summary JSON and full logs into `results/` with a timestamp prefix.

## Cleanup: Remove Test Users After Testing

⚠️  **IMPORTANT**: Test users are created in the backend during the `setup()` phase and registered in the main database. After running tests, you **must** clean them up to avoid polluting your database with test data.

### Automatic Cleanup Notification

Each test scenario's `teardown()` function will print cleanup instructions at the end of the test run. Follow those instructions.

### Manual Cleanup

To delete all test users and their per-user databases:

```bash
# Using the cleanup shell script (macOS/Linux)
cd /Users/viv/CascadeProjects/zault/backend/tests/perf/k6
./cleanup-perf-tests.sh

# Or using Node.js (if better-sqlite3 is available)
cd /Users/viv/CascadeProjects/zault/backend/tests/perf/k6
node ./cleanup-perf-tests.js
```

### What Gets Deleted

The cleanup process:
1. **Reads** `data/users.csv` to get test user list
2. **Deletes** user records from the main `data/zault.db` database
3. **Removes** per-user database files from `data/users/{userId}.db` (including `-shm` and `-wal` files)

### Why Cleanup is Important

- **Data pollution**: Test users accumulate in your database
- **Unrealistic metrics**: Future tests will include cleanup cost in latency measurements
- **Storage bloat**: Per-user databases use disk space (~1-5MB per user)
- **Account confusion**: Test accounts might interfere with real user accounts





