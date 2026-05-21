import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { config, sleepSecondsFromMs } from "../lib/config.js";
import { registerAllUsers } from "../lib/setup.js";
import { userForVu } from "../lib/data.js";
import { login } from "../lib/auth.js";
import { apiGet } from "../lib/http.js";

const readsLatency = new Trend("read_latency_ms");
const readsFailures = new Rate("read_failures");

export const options = {
  scenarios: {
    read_heavy: {
      executor: "constant-vus",
      vus: config.vus,
      duration: config.duration,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    read_failures: ["rate<0.02"],
    read_latency_ms: ["p(95)<2000", "p(99)<5000"],
  },
};

export function setup() {
  return registerAllUsers();
}

export default function (data) {
  const user = userForVu(data.users, __VU);
  login(user);

  const listTrades = apiGet("/api/tradebook/trades?page=0&size=20");
  const allocations = apiGet("/api/tradebook/allocations");
  const files = apiGet("/api/tradebook/files");

  const ok = check(listTrades, {
    "trades returns 200": (r) => r.status === 200,
  }) && check(allocations, {
    "allocations returns 200": (r) => r.status === 200,
  }) && check(files, {
    "files returns 200": (r) => r.status === 200,
  });

  readsFailures.add(!ok);
  readsLatency.add(Math.max(listTrades.timings.duration, allocations.timings.duration, files.timings.duration));
  sleep(sleepSecondsFromMs(config.readSleepMs));
}


