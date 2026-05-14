import { describe, it, expect, beforeEach } from "vitest"
import { getCsrfToken } from "./csrf"

describe("getCsrfToken", () => {
  beforeEach(() => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "",
    })
  })

  it("returns null when no XSRF-TOKEN cookie exists", () => {
    document.cookie = "other=value"
    expect(getCsrfToken()).toBeNull()
  })

  it("returns the token value when cookie exists", () => {
    document.cookie = "session=abc; XSRF-TOKEN=my-token-123"
    expect(getCsrfToken()).toBe("my-token-123")
  })

  it("decodes URI-encoded token values", () => {
    document.cookie = "XSRF-TOKEN=hello%20world"
    expect(getCsrfToken()).toBe("hello world")
  })

  it("returns null for empty cookie string", () => {
    document.cookie = ""
    expect(getCsrfToken()).toBeNull()
  })
})
