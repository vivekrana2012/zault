import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { InputHTMLAttributes } from "react"

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
  hint?: string
}

export function FormField({ label, id, hint, ...inputProps }: FormFieldProps) {
  return (
    <div className="flex items-end gap-4">
      <Label htmlFor={id} className="w-40 shrink-0">{label}</Label>
      <div className="relative flex-1">
        <Input id={id} {...inputProps} />
        {hint && <p className="absolute text-[10px] text-muted-foreground mt-0.5">* {hint}</p>}
      </div>
    </div>
  )
}
