import http from "k6/http";
import { check } from "k6";
import { config } from "./config.js";

export function apiGet(path, params = {}) {
  const url = `${config.baseUrl}${path}`;
  const merged = withDefaultHeaders(params, false);
  return http.get(url, merged);
}

export function apiPost(path, body, params = {}, requiresCsrf = true) {
  const url = `${config.baseUrl}${path}`;
  const merged = withDefaultHeaders(params, requiresCsrf);
  // For multipart uploads, don't set Content-Type header; let k6 auto-detect
  if (body && typeof body === 'object' && body.files && Array.isArray(body.files)) {
    delete merged.headers['Content-Type'];
  }
  return http.post(url, body, merged);
}

export function apiDelete(path, body, params = {}, requiresCsrf = true) {
  const url = `${config.baseUrl}${path}`;
  const merged = withDefaultHeaders(params, requiresCsrf);
  return http.del(url, body, merged);
}

export function apiPatch(path, body, params = {}, requiresCsrf = true) {
  const url = `${config.baseUrl}${path}`;
  const merged = withDefaultHeaders(params, requiresCsrf);
  return http.patch(url, body, merged);
}

export function expectStatus(response, expected, label) {
  const ok = check(response, {
    [label || `status is ${expected}`]: (res) => res.status === expected,
  });
  return ok;
}

function withDefaultHeaders(params, requiresCsrf) {
  const headers = Object.assign({}, params.headers || {});

  // Version header is required on /api/** except explicit exemptions.
  if (!Object.prototype.hasOwnProperty.call(headers, "X-API-Version")) {
    headers["X-API-Version"] = config.apiVersion;
  }

  if (requiresCsrf && !Object.prototype.hasOwnProperty.call(headers, "X-XSRF-TOKEN")) {
    const token = readCookieValue("XSRF-TOKEN");
    if (token) {
      headers["X-XSRF-TOKEN"] = token;
    }
  }

  return Object.assign({}, params, { headers });
}

export function readCookieValue(name) {
  const jar = http.cookieJar();
  const all = jar.cookiesForURL(config.baseUrl);
  const values = all[name];
  if (!values || values.length === 0) {
    return null;
  }
  return values[0];
}

