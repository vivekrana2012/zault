import { AlertCircle } from "lucide-react"

export function FormError({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-3 text-sm font-bold text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
