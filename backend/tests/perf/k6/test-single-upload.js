import http from "k6/http";
import { check } from "k6";
import { loadUsers } from "./lib/data.js";
import { ensureRegistered, login } from "./lib/auth.js";
import { buildTradebookCsv } from "./lib/data.js";
import { readCookieValue } from "./lib/http.js";

const API_VERSION = "1";
const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";
const TRADE_ROWS = 50; // Small for quick test

export const options = {
  scenarios: {
    singleUpload: {
      executor: "constant-vus",
      vus: 1,
      duration: "10s",
    },
  },
};

export function setup() {
  // Register a test user
  const testUser = {
    username: "uploadtest001",
    email: "uploadtest001@test.local",
    password: "TestPassword123!",
    displayName: "Upload Test User",
  };
  ensureRegistered(testUser);
  return testUser;
}

export default function (user) {
  // Login
  login(user);

  // Create CSV
  const csv = buildTradebookCsv(TRADE_ROWS, 1);
  const file = http.file(csv, "test-upload.csv", "text/csv");

  // Build headers
  const headers = {
    "X-API-Version": API_VERSION,
  };
  const csrfToken = readCookieValue("XSRF-TOKEN");
  if (csrfToken) {
    headers["X-XSRF-TOKEN"] = csrfToken;
  }

  // Upload with fixed k6 multipart syntax
                                              tradebook/files`,
    { files: file },  // Single file, NO array wrapper
    { headers }       // NO Content-Type header
  );

  // Check response
  const ok = check(res, {
    "status is 200": (r) => r.status === 200,
    "response has files data": (r) => r.body.includes("files") || r.body.includes("rowCount"),
  });

  if (!ok) {
                  pload failed! Status: ${res.status}`);
    console.log(`Response: ${res.bo    console.log(`Response: ${else {
    console.log(`✓ Upload succeed  ! Status: ${res.status}`);
  }
}
