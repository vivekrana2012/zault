import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ThemeProvider, useTheme } from "./use-theme"

function TestConsumer() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  )
}

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove("dark")
  })

  it("defaults to light when no preference stored", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )
    expect(screen.getByTestId("theme")).toHaveTextContent("light")
  })

  it("reads stored theme from localStorage", () => {
    localStorage.setItem("zault-theme", "dark")
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )
    expect(screen.getByTestId("theme")).toHaveTextContent("dark")
  })

  it("toggles theme and updates localStorage", async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )

    await user.click(screen.getByText("Toggle"))
    expect(screen.getByTestId("theme")).toHaveTextContent("dark")
    expect(localStorage.getItem("zault-theme")).toBe("dark")

    await user.click(screen.getByText("Toggle"))
    expect(screen.getByTestId("theme")).toHaveTextContent("light")
    expect(localStorage.getItem("zault-theme")).toBe("light")
  })

  it("adds dark class to documentElement when dark", () => {
    localStorage.setItem("zault-theme", "dark")
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("throws when used outside ThemeProvider", () => {
    expect(() => render(<TestConsumer />)).toThrow(
      "useTheme must be used within a ThemeProvider"
    )
  })
})
