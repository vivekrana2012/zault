import type { Trade } from "@/types/trades"
import type { CurrencySymbol } from "@/types/holdings"
import { amountFormat, quantityFormat } from "@/lib/currency"

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
            <th className="py-2 px-2 text-left font-semibold uppercase">Symbol</th>
            <th className="py-2 px-2 text-center font-semibold uppercase">Trade Date</th>
            <th className="py-2 px-2 text-center font-semibold uppercase">Trade Type</th>
            <th className="py-2 px-2 text-right font-semibold uppercase">Quantity</th>
            <th className="py-2 px-2 text-right font-semibold uppercase">Price</th>
            <th className="py-2 px-2 text-right font-semibold uppercase">Amount</th>
            <th className="py-2 px-2 text-center font-semibold uppercase">Order Execution Time</th>
          </tr>
        </thead>
        <tbody>
          {trades.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">
                [ Upload a CSV to view trades ]
              </td>
            </tr>
          ) : (
            trades.map((t) => {
              const amount = t.quantity * t.price
              return (
                <tr key={t.id} className="border-b border-foreground/10 hover:bg-accent transition-colors">
                  <td className="py-2 px-2 text-left font-medium">{t.symbol}</td>
                  <td className="py-2 px-2 text-center tabular-nums">{t.trade_date}</td>
                  <td className={[
                    "py-2 px-2 text-center font-medium",
                    t.trade_type === "buy" ? "text-[hsl(var(--gain))]" : "text-[hsl(var(--loss))]",
                  ].join(" ")}>
                    {t.trade_type.toUpperCase()}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">{t.quantity.toLocaleString(undefined, quantityFormat)}</td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {currency}{t.price.toLocaleString(undefined, amountFormat)}
                  </td>
                  <td className={[
                    "py-2 px-2 text-right font-medium tabular-nums",
                    t.trade_type === "buy" ? "text-[hsl(var(--gain))]" : "text-[hsl(var(--loss))]",
                  ].join(" ")}>
                    {currency}{amount.toLocaleString(undefined, amountFormat)}
                  </td>
                  <td className="py-2 px-2 text-center tabular-nums text-xs">{t.order_execution_time}</td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
