import encoding from "k6/encoding";
import { apiGet, apiPost, expectStatus } from "./http.js";

export function ensureRegistered(user) {
  const payload = JSON.stringify({
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    password: user.password,
  });

  const res = apiPost(
    "/api/auth/register",
    payload,
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
    false
  );

  if (res.status !== 201 && res.status !== 409) {
    throw new Error(`register failed for ${user.username}: ${res.status} ${res.body}`);
  }
}

export function login(user) {
  const payload = JSON.stringify({
    username: user.username,
    password: user.password,
  });

  const res = apiPost(
    "/api/auth/login",
    payload,
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
    false
  );

  if (!expectStatus(res, 200, "login succeeds")) {
    throw new Error(`login failed for ${user.username}: ${res.status} ${res.body}`);
  }

  // Prime CSRF cookie for write endpoints.
  const me = apiGet("/api/auth/me");
  if (me.status !== 200) {
    throw new Error(`failed to fetch /api/auth/me after login: ${me.status} ${me.body}`);
  }
}

export function logout() {
  const res = apiPost("/api/auth/logout", null, {}, true);
  if (res.status !== 200) {
    throw new Error(`logout failed: ${res.status} ${res.body}`);
  }
}

export function basicAuthValue(user) {
  return `Basic ${encoding.b64encode(`${user.username}:${user.password}`)}`;
}

