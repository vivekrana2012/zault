import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { SubmitButton } from "./submit-button"

describe("SubmitButton", () => {
  it("renders the label when not loading", () => {
    render(<SubmitButton loading={false} label="Submit" loadingLabel="Submitting..." />)
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument()
  })

  it("renders loading label and spinner when loading", () => {
    const { container } = render(
      <SubmitButton loading={true} label="Submit" loadingLabel="Submitting..." />
    )
    expect(screen.getByRole("button", { name: /Submitting/i })).toBeDisabled()
    expect(container.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("is disabled when disabled prop is passed", () => {
    render(
      <SubmitButton loading={false} disabled={true} label="Submit" loadingLabel="Submitting..." />
    )
    expect(screen.getByRole("button")).toBeDisabled()
  })
})
