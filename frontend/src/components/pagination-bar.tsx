import { BracketButton } from "@/components/bracket-button"

interface PaginationBarProps {
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}

export function PaginationBar({ page, totalPages, onPrev, onNext }: PaginationBarProps) {
  return (
    <div className="mt-4 flex items-center justify-between">
      <BracketButton
        label="← Prev"
        size="sm"
        variant="ghost"
        onClick={onPrev}
        disabled={page <= 1}
        aria-label="Previous page"
      />
      <span className="text-xs text-muted-foreground tabular-nums">
        page {page} / {totalPages}
      </span>
      <BracketButton
        label="Next →"
        size="sm"
        variant="ghost"
        onClick={onNext}
        disabled={page >= totalPages}
        aria-label="Next page"
      />
    </div>
  )
}
