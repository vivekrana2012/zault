import type { Trade } from "@/types/trades"
import type { HoldingWithPercentage } from "@/hooks/use-holdings"

/**
 * Groups trades by asset and sums the absolute total traded value.
 * Returns data shaped for AllocationDonut (HoldingWithPercentage[]).
 */
export function tradesToDonut(trades: Trade[]): { donutData: HoldingWithPercentage[]; total: number } {
  const map = new Map<string, number>()

  for (const trade of trades) {
    map.set(trade.asset, (map.get(trade.asset) ?? 0) + Math.abs(trade.total))
  }

  const total = Array.from(map.values()).reduce((sum, v) => sum + v, 0)

  let id = 1
  const donutData: HoldingWithPercentage[] = Array.from(map.entries()).map(([asset, amount]) => ({
    id: id++,
    category: asset,
    amount,
    percentage: total > 0 ? (amount / total) * 100 : 0,
  }))

  return { donutData, total }
}
