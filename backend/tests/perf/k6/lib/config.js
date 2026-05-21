export const config = {
  baseUrl: __ENV.BASE_URL || "http://localhost:8080",
  apiVersion: __ENV.API_VERSION || "1",
  usersCsvPath: __ENV.USERS_CSV || "../data/users.csv",
  tradeRowsPerFile: parsePositiveInt(__ENV.TRADE_ROWS_PER_FILE, 5000),
  uploadReadSplit: parsePercent(__ENV.MIXED_UPLOAD_PCT, 30),
  authReadSplit: parsePercent(__ENV.MIXED_AUTH_PCT, 10),
  vus: parsePositiveInt(__ENV.VUS, 25),
  duration: __ENV.DURATION || "10m",
  uploadSleepMs: parseNonNegativeInt(__ENV.UPLOAD_SLEEP_MS, 500),
  readSleepMs: parseNonNegativeInt(__ENV.READ_SLEEP_MS, 200),
  authSleepMs: parseNonNegativeInt(__ENV.AUTH_SLEEP_MS, 500),
};

export function sleepSecondsFromMs(ms) {
  return ms / 1000;
}

function parsePositiveInt(raw, fallback) {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInt(raw, fallback) {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parsePercent(raw, fallback) {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  if (parsed < 0) {
    return 0;
  }
  if (parsed > 100) {
    return 100;
  }
  return parsed;
}



