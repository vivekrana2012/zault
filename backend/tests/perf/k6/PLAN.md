# Manual Stress Test Plan (k6)

## Objectives

- Evaluate multi-user behavior with production-default backend settings.
- Measure throughput, error rate, and latency under mixed/read/upload/auth load.
- Detect degradation around tradebook bottlenecks:
  - CSV parse and insert path (`uploadFiles` / `batchInsertTrades`)
  - Allocation recompute (`recomputeAllocations`)
  - Read paths (`/api/tradebook/trades`, `/api/tradebook/allocations`)

## Endpoint Matrix

| Area | Method | Path | Notes |
|---|---|---|---|
| Auth | POST | `/api/auth/register` | Setup only; idempotent (201/409) |
| Auth | POST | `/api/auth/login` | JWT cookie issuance |
| Auth | GET | `/api/auth/me` | Session + CSRF priming |
| Auth | POST | `/api/auth/logout` | Cookie clear + CSRF |
| Tradebook | POST | `/api/tradebook/files` | Multipart upload pressure |
| Tradebook | GET | `/api/tradebook/trades` | Pagination read pressure |
| Tradebook | GET | `/api/tradebook/allocations` | Aggregation read pressure |
| Tradebook | GET | `/api/tradebook/files` | Metadata list |

## Profiles

- Mixed default: `30% upload / 10% auth / 60% read`
- Upload-heavy: upload-focused contention test
- Read-heavy: latency + query pressure
- Auth-only: login/logout throughput and failure handling

## Suggested Manual Progression

1. Baseline: `VUS=10`, `DURATION=5m`
2. Target load: `VUS=25`, `DURATION=10m`
3. Stress load: `VUS=50`, `DURATION=15m`
4. Spike: `VUS=100`, `DURATION=5m`
5. Soak: `VUS=25`, `DURATION=45m`

Quick command for phased run:

```bash
cd /Users/viv/CascadeProjects/zault/backend/tests/perf/k6
./scripts/run-all.sh
```

## Initial Thresholds (Tune after first run)

- Global `http_req_failed < 5%` for mixed/upload, `<2%` for read/auth
- Mixed latency `p95 < 5s`, `p99 < 10s`
- Upload latency `p95 < 8s`, `p99 < 15s`
- Read latency `p95 < 2s`, `p99 < 5s`
- Auth latency `p95 < 1.5s`, `p99 < 3s`

## Data Policy

- Do not commit large generated CSV files.
- Keep generated artifacts under `data/generated/` (git-ignored).
- Keep run outputs under `results/` (git-ignored except `.gitkeep`).

## Run Artifacts to Capture

- k6 summary output (`--summary-export=results/*.json`)
- Backend logs for errors/timeouts/lock contention
- DB growth observations in `data/users/*.db` during tests
- Notes on first failure mode and recovery behavior


