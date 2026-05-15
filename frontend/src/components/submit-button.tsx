import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SubmitButtonProps {
  loading: boolean
  disabled?: boolean
  label: string
  loadingLabel: string
}

export function SubmitButton({ loading, disabled, label, loadingLabel }: SubmitButtonProps) {
  return (
    <Button type="submit" disabled={loading || disabled}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        <>[ {label} ]</>
      )}
    </Button>
  )
}
