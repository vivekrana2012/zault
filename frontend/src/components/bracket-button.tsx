import { Button, type ButtonProps } from "@/components/ui/button"
import { forwardRef } from "react"

interface BracketButtonProps extends Omit<ButtonProps, "children" | "asChild"> {
  label: string
}

export const BracketButton = forwardRef<HTMLButtonElement, BracketButtonProps>(
  ({ label, ...props }, ref) => {
    return (
      <Button ref={ref} {...props}>
        [ {label} ]
      </Button>
    )
  },
)
BracketButton.displayName = "BracketButton"
