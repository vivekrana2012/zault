import type { Trade } from "@/types/trades"
import type { HoldingWithPercentage } from "@/hooks/use-holdings"
import { roundAmount } from "@/lib/currency"

/**
 * Groups trades by ISIN and computes net value (buys positive, sells negative).
 * Uses symbol as the display label for each grouped slice.
 * Returns data shaped for AllocationDonut (HoldingWithPercentage[]).
 */
export function tradesToDonut(trades: Trade[]): { donutData: HoldingWithPercentage[]; total: number } {
  const map = new Map<string, { symbol: string; amount: number }>()

  for (const trade of trades) {
    const value = roundAmount(trade.quantity * trade.price)
    const signed = trade.trade_type === "sell" ? -value : value
    const existing = map.get(trade.isin)
    if (existing) {
      existing.amount = roundAmount(existing.amount + signed)
      continue
    }

    map.set(trade.isin, {
      symbol: trade.symbol,
      amount: signed,
    })
  }

  // Filter out securities with zero or negative net amounts (fully exited positions)
  const entries = Array.from(map.values()).filter((v) => v.amount > 0)

  const total = roundAmount(entries.reduce((sum, value) => sum + value.amount, 0))

  let id = 1
  const donutData: HoldingWithPercentage[] = entries
    .sort((a, b) => b.amount - a.amount)
    .map(({ symbol, amount }) => ({
      id: id++,
      category: symbol,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }))

  return { donutData, total }
}
