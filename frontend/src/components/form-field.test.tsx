import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { FormField } from "./form-field"

describe("FormField", () => {
  it("renders label and input", () => {
    render(<FormField label="Username" id="username" />)
    expect(screen.getByLabelText("Username")).toBeInTheDocument()
  })

  it("passes input props through", () => {
    render(
      <FormField label="Email" id="email" type="email" required placeholder="you@example.com" />
    )
    const input = screen.getByLabelText("Email")
    expect(input).toHaveAttribute("type", "email")
    expect(input).toBeRequired()
    expect(input).toHaveAttribute("placeholder", "you@example.com")
  })

  it("associates label with input via id", () => {
    render(<FormField label="Password" id="pw" type="password" />)
    const input = screen.getByLabelText("Password")
    expect(input).toHaveAttribute("id", "pw")
  })
})
