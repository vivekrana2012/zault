import type { Trade } from "@/types/trades"
import type { CurrencySymbol } from "@/types/holdings"

interface TradesTableProps {
  trades: Trade[]
  currency: CurrencySymbol
}

export function TradesTable({ trades, currency }: TradesTableProps) {
  return (
    <div className="w-full">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2">
            <th className="py-2 pr-4 text-left font-semibold uppercase">Date</th>
            <th className="py-2 pr-4 text-left font-semibold uppercase">Asset</th>
            <th className="py-2 pr-4 text-left font-semibold uppercase">Type</th>
            <th className="py-2 pr-4 text-right font-semibold uppercase">Qty</th>
            <th className="py-2 pr-4 text-right font-semibold uppercase">Price</th>
            <th className="py-2 text-right font-semibold uppercase">Total</th>
          </tr>
        </thead>
        <tbody>
          {trades.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                [ Upload a CSV to view trades ]
              </td>
            </tr>
          ) : (
            trades.map((t) => (
              <tr key={t.id} className="border-b border-foreground/10 hover:bg-accent transition-colors">
                <td className="py-2 pr-4 text-left tabular-nums">{t.date}</td>
                <td className="py-2 pr-4 text-left font-medium">{t.asset}</td>
                <td className={[
                  "py-2 pr-4 text-left font-medium",
                  t.type === "BUY" ? "text-[hsl(var(--gain))]" : "text-[hsl(var(--loss))]",
                ].join(" ")}>
                  {t.type}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">{t.quantity.toLocaleString()}</td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {currency}{t.price.toLocaleString()}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {currency}{t.total.toLocaleString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
