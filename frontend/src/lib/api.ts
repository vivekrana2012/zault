import { getCsrfToken } from "@/lib/csrf"
import type { components } from "@/api/schema"

export type ErrorResponse = components["schemas"]["ErrorResponse"]
export type LoginRequest = components["schemas"]["LoginRequest"]
export type LoginResponse = components["schemas"]["LoginResponse"]
export type RegisterRequest = components["schemas"]["RegisterRequest"]
export type RegisterResponse = components["schemas"]["RegisterResponse"]
export type MeResponse = components["schemas"]["MeResponse"]
export type LogoutResponse = components["schemas"]["LogoutResponse"]

export interface ApiResult<T> {
  ok: boolean
  status: number
  data: T | null
  error: string | null
}

function getHeaders(includeBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {}
  if (includeBody) {
    headers["Content-Type"] = "application/json"
  }
  const csrfToken = getCsrfToken()
  if (csrfToken) {
    headers["X-XSRF-TOKEN"] = csrfToken
  }
  return headers
}

async function parseResponse<T>(res: Response): Promise<ApiResult<T>> {
  const data = await res.json().catch(() => null)
  if (res.ok) {
    return { ok: true, status: res.status, data: data as T, error: null }
  }
  const error = (data as ErrorResponse | null)?.error ?? `Request failed (${res.status})`
  return { ok: false, status: res.status, data: null, error }
}

export async function apiPost<T = unknown>(
  url: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: getHeaders(body != null),
    body: body != null ? JSON.stringify(body) : undefined,
  })
  return parseResponse<T>(res)
}

export async function apiGet<T = unknown>(url: string): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(false),
  })
  return parseResponse<T>(res)
}
