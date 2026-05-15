import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { ThemeProvider } from "@/hooks/use-theme"
import { AuthProvider } from "@/hooks/use-auth"
import LoginPage from "./LoginPage"

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 })
  )
})

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe("LoginPage", () => {
  it("renders login form with username and password fields", () => {
    renderLoginPage()
    expect(screen.getByLabelText("Username")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
  })

  it("renders login button", () => {
    renderLoginPage()
    expect(screen.getByRole("button", { name: "[ Login ]" })).toBeInTheDocument()
  })

  it("renders link to register page", () => {
    renderLoginPage()
    expect(screen.getByText("create an account?")).toBeInTheDocument()
  })

  it("allows typing in form fields", async () => {
    const user = userEvent.setup()
    renderLoginPage()

    const usernameInput = screen.getByLabelText("Username")
    const passwordInput = screen.getByLabelText("Password")

    await user.type(usernameInput, "testuser")
    await user.type(passwordInput, "secret123")

    expect(usernameInput).toHaveValue("testuser")
    expect(passwordInput).toHaveValue("secret123")
  })
})
