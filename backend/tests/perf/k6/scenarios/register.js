/**
 * Registration Performance Test
 *
 * Measures registration endpoint latency at three concurrency levels:
 *   - 1 user in parallel
 *   - 10 users in parallel
 *   - 100 users in parallel
 *
 * Scenarios run sequentially with 10s gaps to avoid overlap.
 *
 * Run:
 *   k6 run scenarios/register.js --env BASE_URL=http://localhost:8080
 *
 * Or use the wrapper script (includes automatic cleanup):
 *   ./scripts/run-register-perf.sh
 */

import { check } from "k6";
import { Trend, Rate } from "k6/metrics";
import { apiPost } from "../lib/http.js";
import { config } from "../lib/config.js";

// Custom metrics
const registrationLatency = new Trend("registration_latency_ms", true);
const registrationFailures = new Rate("registration_failures");

// Unique run ID to avoid collisions across runs
const RUN_ID = `${Date.now()}`;

export const options = {
  scenarios: {
    register_1vu: {
      executor: "per-vu-iterations",
      vus: 1,
      iterations: 1,
      startTime: "0s",
      gracefulStop: "5s",
      exec: "registerUser",
      env: { SCENARIO: "1vu" },
    },
    register_10vu: {
      executor: "per-vu-iterations",
      vus: 10,
      iterations: 1,
      startTime: "10s",
      gracefulStop: "5s",
      exec: "registerUser",
      env: { SCENARIO: "10vu" },
    },
    register_100vu: {
      executor: "per-vu-iterations",
      vus: 100,
      iterations: 1,
      startTime: "20s",
      gracefulStop: "5s",
      exec: "registerUser",
      env: { SCENARIO: "100vu" },
    },
  },
  thresholds: {
    registration_latency_ms: ["p(95)<1000", "p(99)<2000"],
    registration_failures: ["rate<0.01"],
    http_req_failed: ["rate<0.01"],
  },
};

export function registerUser() {
  const scenario = __ENV.SCENARIO || "unknown";
  const username = `perfuser_reg_${scenario}_${__VU}_${RUN_ID}`;
  const email = `${username}@perftest.local`;
  const password = "PerfTest1234!";

  const payload = JSON.stringify({
    username: username,
    email: email,
    displayName: username,
    password: password,
  });

  const start = Date.now();

  const res = apiPost("/api/auth/register", payload, {
    headers: { "Content-Type": "application/json" },
  }, false);

  const duration = Date.now() - start;

  registrationLatency.add(duration);

  const passed = check(res, {
    "registration returns 201": (r) => r.status === 201,
  });

  registrationFailures.add(!passed);

  if (!passed) {
    console.warn(
      `[${scenario}] VU${__VU} registration failed: status=${res.status} body=${res.body}`
    );
  }
}

