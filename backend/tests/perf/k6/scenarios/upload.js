import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { config, sleepSecondsFromMs } from "../lib/config.js";
import { loadUsers, userForVu, buildTradebookCsv } from "../lib/data.js";
import { login } from "../lib/auth.js";
import { readCookieValue } from "../lib/http.js";
import { logCleanupInstructions } from "../lib/cleanup.js";
import { registerAllUsers } from "../lib/setup.js";

// Must load users at init stage (open() only works here)
const users = loadUsers(config.usersCsvPath);

const uploadLatency = new Trend("upload_latency_ms");
const uploadFailures = new Rate("upload_failures");

export const options = {
  scenarios: {
    upload_heavy: {
      executor: "constant-vus",
      vus: config.vus,
      duration: config.duration,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    upload_failures: ["rate<0.05"],
    upload_latency_ms: ["p(95)<8000", "p(99)<15000"],
  },
};

export function setup() {
  return registerAllUsers();
}

export function teardown(data) {
  if (data && data.users) {
    logCleanupInstructions(data.users);
  }
}

export default function (data) {
  const vu = __VU;
  const iter = __ITER;
  const user = userForVu(data.users, vu);

  login(user);

  const csv = buildTradebookCsv(config.tradeRowsPerFile, vu * 100000 + iter);
  const file = http.file(csv, `trades_vu${vu}_iter${iter}.csv`, "text/csv");

  // Build headers with API version and CSRF token
  const headers = {
    "X-API-Version": config.apiVersion,
  };
  const csrfToken = readCookieValue("XSRF-TOKEN");
  if (csrfToken) {
    headers["X-XSRF-TOKEN"] = csrfToken;
  }

  // For k6 multipart/form-data: pass files directly without Content-Type header
  // k6 auto-detects when body contains http.file() objects
  const res = http.post(
    `${config.baseUrl}/api/tradebook/files`,
    { files: file },  // Single file object (k6 handles as multipart)
    { headers }       // No Content-Type: k6 will set multipart/form-data
  );

  const ok = check(res, {
    "upload returns 200": (r) => r.status === 200,
  });

  uploadFailures.add(!ok);
  uploadLatency.add(res.timings.duration);
  sleep(sleepSecondsFromMs(config.uploadSleepMs));
}
