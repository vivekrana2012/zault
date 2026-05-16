import { getCsrfToken } from "@/lib/csrf"
import type { components } from "@/api/schema"

export type ErrorResponse = components["schemas"]["ErrorResponse"]
export type LoginRequest = components["schemas"]["LoginRequest"]
export type LoginResponse = components["schemas"]["LoginResponse"]
export type RegisterRequest = components["schemas"]["RegisterRequest"]
export type RegisterResponse = components["schemas"]["RegisterResponse"]
export type MeResponse = components["schemas"]["MeResponse"]
export type LogoutResponse = components["schemas"]["LogoutResponse"]
export type InvestmentDto = components["schemas"]["InvestmentDto"]
export type CreateInvestmentRequest = components["schemas"]["CreateInvestmentRequest"]
export type UpdateInvestmentAmountRequest = components["schemas"]["UpdateInvestmentAmountRequest"]
export type TradeDto = components["schemas"]["TradeDto"]
export type TradesPageDto = components["schemas"]["TradesPageDto"]
export type TradeFileDto = components["schemas"]["TradeFileDto"]
export type AllocationDto = components["schemas"]["AllocationDto"]
export type AllocationsDto = components["schemas"]["AllocationsDto"]

export interface ApiResult<T> {
  ok: boolean
  status: number
  data: T | null
  error: string | null
}

function getHeaders(includeBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    "X-API-Version": "1",
  }
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

export async function apiGet<T = unknown>(url: string): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(false),
  })
  return parseResponse<T>(res)
}

async function apiWithBody<T>(
  method: string,
  url: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: getHeaders(body != null),
    body: body != null ? JSON.stringify(body) : undefined,
  })
  return parseResponse<T>(res)
}

export function apiPost<T = unknown>(url: string, body?: unknown): Promise<ApiResult<T>> {
  return apiWithBody<T>("POST", url, body)
}

export function apiPatch<T = unknown>(url: string, body?: unknown): Promise<ApiResult<T>> {
  return apiWithBody<T>("PATCH", url, body)
}

export function apiPut<T = unknown>(url: string, body?: unknown): Promise<ApiResult<T>> {
  return apiWithBody<T>("PUT", url, body)
}

export async function apiDelete<T = unknown>(url: string): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method: "DELETE",
    credentials: "include",
    headers: getHeaders(false),
  })
  return parseResponse<T>(res)
}

export async function apiUploadFiles<T = unknown>(url: string, files: File[]): Promise<ApiResult<T>> {
  const formData = new FormData()
  for (const file of files) {
    formData.append("files", file)
  }
  const headers: Record<string, string> = {
    "X-API-Version": "1",
  }
  const csrfToken = getCsrfToken()
  if (csrfToken) {
    headers["X-XSRF-TOKEN"] = csrfToken
  }
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers,
    body: formData,
  })
  return parseResponse<T>(res)
}
