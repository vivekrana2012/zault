import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { config, sleepSecondsFromMs } from "../lib/config.js";
import { registerAllUsers } from "../lib/setup.js";
import { userForVu } from "../lib/data.js";
import { login, logout } from "../lib/auth.js";
import { apiGet } from "../lib/http.js";

const authLatency = new Trend("auth_latency_ms");
const authFailures = new Rate("auth_failures");

export const options = {
  setupTimeout: "600s",
  scenarios: {
    auth_only: {
      executor: "constant-vus",
      vus: config.vus,
      duration: config.duration,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    auth_failures: ["rate<0.02"],
    auth_latency_ms: ["p(95)<1500", "p(99)<3000"],
  },
};

export function setup() {
  return registerAllUsers();
}

export default function (data) {
  const user = userForVu(data.users, __VU + __ITER);
  const started = Date.now();

  let ok = true;
  try {
    login(user);
    const me = apiGet("/api/auth/me");
    ok = ok && check(me, { "me returns 200": (r) => r.status === 200 });
    logout();
  } catch (err) {
    ok = false;
  }

  authFailures.add(!ok);
  authLatency.add(Date.now() - started);
  sleep(sleepSecondsFromMs(config.authSleepMs));
}


