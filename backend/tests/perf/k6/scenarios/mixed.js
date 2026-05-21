import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { config, sleepSecondsFromMs } from "../lib/config.js";
import { loadUsers, userForVu, buildTradebookCsv } from "../lib/data.js";
import { login, logout } from "../lib/auth.js";
import { apiGet, readCookieValue } from "../lib/http.js";
import { logCleanupInstructions } from "../lib/cleanup.js";
import { registerAllUsers } from "../lib/setup.js";

// Must load users at init stage (open() only works here)
const users = loadUsers(config.usersCsvPath);

const mixedLatency = new Trend("mixed_latency_ms");
const mixedFailures = new Rate("mixed_failures");

export const options = {
  setupTimeout: "600s",
  scenarios: {
    mixed: {
      executor: "constant-vus",
      vus: config.vus,
      duration: config.duration,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    mixed_failures: ["rate<0.05"],
    mixed_latency_ms: ["p(95)<5000", "p(99)<10000"],
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
  const user = userForVu(data.users, __VU);
  const action = pickAction();
  const started = Date.now();

  let ok = true;
  try {
    if (action === "upload") {
      login(user);
      const csv = buildTradebookCsv(config.tradeRowsPerFile, __VU * 100000 + __ITER);
      const file = http.file(csv, `mixed_vu${__VU}_iter${__ITER}.csv`, "text/csv");

      // Build headers with API version and CSRF token
      const headers = {
        "X-API-Version": config.apiVersion,
      };
      const csrfToken = readCookieValue("XSRF-TOKEN");
      if (csrfToken) {
        headers["X-XSRF-TOKEN"] = csrfToken;
      }

      // For k6 multipart/form-data: pass files directly without Content-Type header
      const res = http.post(
        `${config.baseUrl}/api/tradebook/files`,
        { files: file }, // Single file object (k6 handles as multipart)
        { headers } // No Content-Type: k6 will set multipart/form-data
      );

      ok = check(res, { "mixed upload returns 200": (r) => r.status === 200 });
      sleep(sleepSecondsFromMs(config.uploadSleepMs));
    } else if (action === "auth") {
      login(user);
      logout();
      sleep(sleepSecondsFromMs(config.authSleepMs));
    } else {
      login(user);
      const r1 = apiGet("/api/tradebook/trades?page=0&size=20");
      const r2 = apiGet("/api/tradebook/allocations");
      ok = check(r1, { "mixed trades returns 200": (r) => r.status === 200 })
        && check(r2, { "mixed allocations returns 200": (r) => r.status === 200 });
      sleep(sleepSecondsFromMs(config.readSleepMs));
    }
  } catch (err) {
    ok = false;
  }

  mixedFailures.add(!ok);
  mixedLatency.add(Date.now() - started);
}

function pickAction() {
  const uploadPct = config.uploadReadSplit;
  const authPct = config.authReadSplit;
  const roll = Math.random() * 100;
  if (roll < uploadPct) {
    return "upload";
  }
  if (roll < uploadPct + authPct) {
    return "auth";
  }
  return "read";
}
