export function FormError({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center p-3 text-sm font-bold text-destructive">
      <span>{message}</span>
    </div>
  )
}
