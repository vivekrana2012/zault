import type { Trade } from "@/types/trades"
import type { CurrencySymbol } from "@/types/holdings"
import { TradesTable } from "@/components/trades-table"
import { PaginationBar } from "@/components/pagination-bar"

interface TradebookSectionProps {
  trades: Trade[]
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
  currency: CurrencySymbol
  hasData: boolean
}

export function TradebookSection({
  trades,
  page,
  totalPages,
  onPrev,
  onNext,
  currency,
  hasData,
}: TradebookSectionProps) {
  return (
    <div className="sketch-lines pl-6 pt-4">
      <h2 className="text-lg font-semibold mb-6">
        <span className="text-muted-foreground mr-2">##</span>
        Tradebook
      </h2>
      <div className="min-w-0">
        <TradesTable trades={trades} currency={currency} />
        {hasData && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            onPrev={onPrev}
            onNext={onNext}
          />
        )}
      </div>
    </div>
  )
}
