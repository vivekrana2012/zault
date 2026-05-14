import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { FormError } from "./form-error"

describe("FormError", () => {
  it("renders the error message", () => {
    render(<FormError message="Something went wrong" />)
    expect(screen.getByText("Something went wrong")).toBeInTheDocument()
  })

  it("renders the alert icon", () => {
    const { container } = render(<FormError message="Error" />)
    expect(container.querySelector("svg")).toBeInTheDocument()
  })
})
