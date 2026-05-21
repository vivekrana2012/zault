import { apiGet, readCookieValue } from "./http.js";

export function ensureCsrfReady() {
  const me = apiGet("/api/auth/me");
  if (me.status !== 200) {
    throw new Error(`cannot initialize CSRF token: /api/auth/me -> ${me.status}`);
  }
  const token = readCookieValue("XSRF-TOKEN");
  if (!token) {
    throw new Error("XSRF-TOKEN cookie missing after /api/auth/me");
  }
  return token;
}

