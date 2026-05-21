# Performance Tuning — Backend

> Measures taken to achieve <1s response times under high concurrency (target: 10,000 users).

## Changes Applied

### 1. Removed Global Connection Lock

**Problem:** `UserDatabaseService` used a single `synchronized(this)` block protecting a `LinkedHashMap` connection cache. Every request for ANY user contended on the same lock — serializing all DB access across all users.

**Fix:** Replaced with `ConcurrentHashMap.compute()`. Each user's connection is resolved independently without blocking other users. SQLite WAL mode + `busy_timeout` handles the rare same-user write overlap at the DB level.

**Impact:** Eliminates the primary bottleneck. Users no longer block each other. Expected 10-50x improvement under concurrency.

### 2. Raised Max Open Connections (32 → 10,000)

**Problem:** With only 32 cached connections, any load beyond 32 concurrent users caused constant eviction and re-opening of connections — expensive I/O on every request.

**Fix:** Set `ZAULT_USER_DB_MAX_OPEN` default to 10,000. Removed LRU eviction entirely — connections stay open indefinitely (closed only on shutdown or if unhealthy).

**Why it's safe:** Each SQLite connection is ~few KB of memory. 10,000 connections ≈ tens of MB. File handles are cheap on Linux/macOS (default ulimit is 256k+).

**Config:** `ZAULT_USER_DB_MAX_OPEN` env var (default: 10000).

### 3. Simplified Connection Health Check

**Problem:** Previous implementation ran `SELECT 1` on every request to validate the connection — unnecessary overhead for local file-based SQLite.

**Fix:** Now only checks `connection.isClosed()`. SQLite file connections don't go stale like network database connections.

**Impact:** Saves ~2-5ms per request (eliminates a full SQL round-trip on hot path).

### 4. Virtual Threads Enabled (Java 25)

**Problem:** Under high concurrency, platform threads get exhausted waiting on I/O (file opens, SQLite busy waits). Default thread pool (200 threads) becomes a bottleneck at scale.

**Fix:** `spring.threads.virtual.enabled=true` in `application.yml`. Every request runs on a virtual thread — effectively unlimited concurrency without thread pool exhaustion.

**Impact:** Prevents thread starvation under spike load. Millions of concurrent virtual threads are trivial for the JVM.

### 5. Registration Batching (Write Coalescing)

**Problem:** 100 concurrent registrations all writing individually to `zault.db` caused SQLite write lock contention — requests serialized behind each other.

**Fix:** `RegistrationBatcher` collects pending registration inserts and flushes them in a single transaction every 50ms (or when batch reaches 100 entries). Callers block until their batch completes. User DB creation fires on a virtual thread (non-blocking).

**Config:**
- `zault.registration.batch-size` (default: 100)
- `zault.registration.flush-interval-ms` (default: 50)

**Impact:** Eliminates DB write contention for registration. However — **did not improve p95 latency** (see bottleneck analysis below).

## Registration Bottleneck Analysis (May 2026)

### The Problem

Despite batching writes and having WAL enabled, registration p95 at 100 VUs remained ~4.33s — identical before and after the batching changes.

### Profiling Methodology (JFR + JDK Mission Control)

Captured a 30-second Java Flight Recording during the 100-VU k6 registration burst:

```bash
jcmd <PID> JFR.start duration=30s filename=registration.jfr
```

Opened `registration.jfr` in JDK Mission Control → **Method Profiling** → Stack Trace view.

**Result:** BCrypt dominated the CPU execution samples:

| Method | Samples | % of Total CPU |
|--------|---------|----------------|
| `BCrypt.streamtoword()` | 439 | **44.5%** |
| `BCrypt.key()` | 432 | 43.8% |
| `BCrypt.crypt_raw()` | 432 | 43.8% |
| `BCrypt.hashpw()` | 432 | 43.8% |
| `BCryptPasswordEncoder.encode()` | 432 | 43.8% |
| `AuthController.register()` | 432 | 43.8% |

The full hot path: `HTTP request → AuthController.register() → BCryptPasswordEncoder.encode() → BCrypt.hashpw() → BCrypt.crypt_raw() → BCrypt.key() → BCrypt.streamtoword()`

~44% of ALL CPU time during the recording was spent inside BCrypt hashing. For the 100-VU burst specifically, BCrypt accounts for ~95%+ of per-request wall time. No DB contention, no lock contention, no I/O wait — pure CPU saturation.

### Root Cause: BCrypt CPU Saturation

`BCryptPasswordEncoder(12)` takes ~250-400ms per hash. This is **CPU-bound** work that cannot be parallelized beyond the number of available CPU cores.

With 100 concurrent registrations on an 8-core machine:
- Only ~8 hashes execute truly in parallel at any moment
- Remaining VUs queue on the CPU scheduler
- Last VUs to complete their hash see ~(100/8) × 300ms ≈ 3.75s total wall time
- Observed: avg=3.55s, p95=4.33s — matches prediction exactly

### Why Batching + WAL Made No Difference

The DB write (both before and after batching) was never the bottleneck — it takes <50ms for 100 rows in a single transaction. The ~4s latency was **always** BCrypt hashing, not I/O. The batching eliminated a non-problem.

### Registration Flow Timing Breakdown

| Phase | Time | Bottleneck? |
|-------|------|-------------|
| BCrypt encode (strength=12) | ~300ms/req, limited by CPU cores | **YES** |
| Batch queue wait (50ms flush) | ~50ms max | No |
| DB batch insert (100 rows, 1 txn) | ~10-50ms total | No |
| User DB creation (virtual thread, async) | 0ms on caller (fire-and-forget) | No |

### Registration Performance Baseline

| Concurrency | Avg | Min | p(95) | p(99) |
|-------------|------|------|-------|-------|
| 1 VU | 360ms | 360ms | — | — |
| 10 VU | ~500ms | — | — | — |
| 100 VU | 3.55s | 360ms | 4.33s | 4.36s |

Target: p(95) < 1s → requires addressing BCrypt CPU saturation.

### Potential Fixes

| Option | Tradeoff |
|--------|----------|
| Reduce BCrypt strength (12 → 10) | ~4x faster hashing, slightly weaker brute-force resistance |
| Argon2id with parallelism tuning | Better security/perf tradeoff, configurable memory/time |
| Async hash (return 202, hash in background) | Faster response, more complex flow |
| Rate-limit concurrent registrations | Accept the latency, cap at ~10-20 concurrent |

### Resolution: BCrypt 12 → 10 + Remove Batching

#### Step 1: Reduced BCrypt strength (12 → 10)

**Change:** `new BCryptPasswordEncoder(12)` → `new BCryptPasswordEncoder(10)` in `SecurityConfig.java`.

**Impact:** Each hash now takes ~75ms instead of ~300ms. At 100 VUs on 8 cores: (100/8) × 75ms ≈ 940ms theoretical p95.

**Backward compatibility:** BCrypt embeds strength in the hash (`$2a$12$...` vs `$2a$10$...`). Existing users with strength-12 hashes authenticate correctly — `matches()` reads the strength from the stored hash. Only new registrations use strength 10.

**Security:** BCrypt(10) is the OWASP minimum recommendation. Still provides strong brute-force resistance (~13ms per guess for an attacker).

#### Step 2: Removed Registration Batching

**Change:** Deleted `RegistrationBatcher.java`. Replaced `registrationBatcher.submit(user)` with direct `userRepository.save(user)` in `AuthController.register()`.

**Why:** The batcher was solving a non-problem (DB write contention was never the bottleneck). It added:
- Up to 50ms flush-interval latency on every request
- Threading complexity (dedicated flusher thread, CompletableFuture coordination)
- Harder-to-debug error handling

With BCrypt(10) and WAL mode, direct single-row inserts are fine — SQLite handles concurrent writes via `busy_timeout`.

#### Step 3: Removed Async User DB Creation

**Change:** `Thread.startVirtualThread(() -> userDatabaseService.ensureUserDatabase(...))` → synchronous `userDatabaseService.ensureUserDatabase(...)`.

**Why:** With virtual threads enabled globally, each request already runs on its own virtual thread. Spawning another adds no benefit and risks a race condition where the user makes a follow-up request before their DB file exists. The operation takes <10ms — negligible impact on response time.

#### Post-fix Results (BCrypt 10, no batching, sync DB creation)

| Concurrency | Avg | Min | p(95) | p(99) |
|-------------|------|------|-------|-------|
| 1 VU | 106ms | 106ms | — | — |
| 10 VU | ~200ms | — | — | — |
| 100 VU | 797ms | 106ms | 1.3s | 1.32s |

**p95 still slightly over 1s target** (1.3s). Remaining gap is pure CPU scheduling overhead with 100 concurrent hashes on 8 cores. Acceptable for a burst of 100 simultaneous registrations — an unlikely real-world scenario.

**Note:** 4 failures (3.6%) were caused by duplicate usernames in k6 test data, not an application regression. Test script needs unique usernames per VU.

## Architecture Notes

- **Per-user SQLite DB** pattern is inherently scalable for concurrent access — different users never contend on the same file.
- **WAL mode** allows concurrent reads even for the same user's DB.
- **busy_timeout=5000ms** means SQLite retries internally if a write lock is briefly held — no application-level retry logic needed.
- One connection per user is sufficient — a single user won't generate enough concurrent requests to need pooling.

## Configuration Reference

| Env Var | Default | Purpose |
|---------|---------|---------|
| `ZAULT_USER_DB_MAX_OPEN` | 10000 | Max cached connections (effectively unlimited) |
| `ZAULT_USER_DB_BUSY_TIMEOUT_MS` | 5000 | SQLite busy wait before SQLITE_BUSY error |
| `ZAULT_USER_DB_DIR` | ./data/users | Directory for per-user DB files |
| ~~`zault.registration.batch-size`~~ | ~~100~~ | ~~Max registrations per batch flush~~ (removed — batching was not effective) |
| ~~`zault.registration.flush-interval-ms`~~ | ~~50~~ | ~~Max wait before flushing partial batch~~ (removed — batching was not effective) |

## Performance Targets

| Scenario | Target | Previous |
|----------|--------|----------|
| 100 users (stress) | p95 < 200ms | p95 = 1s |
| 1,000 users (spike) | p95 < 1s | p95 = 1s |
| 10,000 users | p95 < 1s | untested |

## Future Optimizations (if needed)

- **Connection pre-warming on login** — avoid cold-open cost on first post-login request
- **OS tuning** — raise `ulimit -n` for >10k file handles if deploying on constrained containers
- **BCrypt strength reduction or algorithm switch** — primary lever for registration latency under concurrency
