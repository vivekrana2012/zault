import { useState, useMemo } from "react"
import type { HoldingWithPercentage } from "@/hooks/use-holdings"
import type { CurrencySymbol } from "@/types/holdings"
import { PaginationBar } from "@/components/pagination-bar"
import { amountFormat } from "@/lib/currency"

const PAGE_SIZE = 10

interface AllocationTableProps {
  data: HoldingWithPercentage[]
  total: number
  currency: CurrencySymbol
}

export function AllocationTable({ data, total, currency }: AllocationTableProps) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE))
  const pagedData = useMemo(
    () => data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [data, page],
  )

  return (
    <div className="w-full">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2">
            <th className="py-2 px-2 text-left font-semibold uppercase">Symbol</th>
            <th className="py-2 px-2 text-right font-semibold uppercase">Amount</th>
            <th className="py-2 px-2 text-center font-semibold uppercase">%</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-8 text-center text-muted-foreground text-sm">
                [ No data ]
              </td>
            </tr>
          ) : (
            <>
              {page === 1 && (
                <tr className="border-b-2 font-semibold">
                  <td className="py-2 px-2 text-left">Total</td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {currency}{total.toLocaleString(undefined, amountFormat)}
                  </td>
                  <td className="py-2 px-2 text-center tabular-nums">100.0%</td>
                </tr>
              )}
              {pagedData.map((row) => (
                <tr key={row.id} className="border-b border-foreground/10 hover:bg-accent transition-colors">
                  <td className="py-2 px-2 text-left font-medium">{row.category}</td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {currency}{row.amount.toLocaleString(undefined, amountFormat)}
                  </td>
                  <td className="py-2 px-2 text-center tabular-nums">
                    {row.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>
      {totalPages > 1 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      )}
    </div>
  )
}
