import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { ThemeProvider } from "@/hooks/use-theme"
import { AuthProvider } from "@/hooks/use-auth"
import RegisterPage from "./RegisterPage"

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 })
  )
})

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          <RegisterPage />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe("RegisterPage", () => {
  it("renders all form fields", () => {
    renderRegisterPage()
    expect(screen.getByLabelText("Username")).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByLabelText("Display Name")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument()
  })

  it("renders register button", () => {
    renderRegisterPage()
    expect(screen.getByRole("button", { name: "[ Register ]" })).toBeInTheDocument()
  })

  it("renders link back to login", () => {
    renderRegisterPage()
    expect(screen.getByText("Back to Login")).toBeInTheDocument()
  })

  it("allows filling in all form fields", async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    await user.type(screen.getByLabelText("Username"), "newuser")
    await user.type(screen.getByLabelText("Email"), "new@example.com")
    await user.type(screen.getByLabelText("Display Name"), "New User")
    await user.type(screen.getByLabelText("Password"), "pass123")
    await user.type(screen.getByLabelText("Confirm Password"), "pass123")

    expect(screen.getByLabelText("Username")).toHaveValue("newuser")
    expect(screen.getByLabelText("Email")).toHaveValue("new@example.com")
    expect(screen.getByLabelText("Display Name")).toHaveValue("New User")
    expect(screen.getByLabelText("Password")).toHaveValue("pass123")
    expect(screen.getByLabelText("Confirm Password")).toHaveValue("pass123")
  })
})
