import { useState, useCallback } from "react"
import { apiGet } from "@/lib/api"
import type { components } from "@/api/schema"

type TradeTimelineDto = components["schemas"]["TradeTimelineDto"]

export interface TradePoint {
  time: Date
  tradeType: "buy" | "sell"
  amount: number
}

export function useExecutionTimes() {
  const [trades, setTrades] = useState<TradePoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetched, setFetched] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await apiGet<TradeTimelineDto>("/api/tradebook/trades/timeline")
    if (result.ok && result.data) {
      const parsed: TradePoint[] = (result.data.trades ?? [])
        .map((t) => ({
          time: new Date(t.time ?? ""),
          tradeType: (t.tradeType as "buy" | "sell") ?? "buy",
          amount: t.amount ?? 0,
        }))
        .filter((d) => !isNaN(d.time.getTime()))
      setTrades(parsed)
      setFetched(true)
    } else {
      setError(result.error ?? "Failed to load execution times")
    }
    setLoading(false)
  }, [])

  return { trades, loading, error, fetched, fetch }
}
