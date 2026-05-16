import type { Trade } from "@/types/trades"
import { roundAmount } from "@/lib/currency"

/**
 * Parses a CSV string into an array of Trade objects.
 * Expected header (case-insensitive):
 * symbol,isin,trade_date,exchange,segment,series,trade_type,auction,quantity,price,trade_id,order_id,order_execution_time
 * Malformed or blank rows are silently skipped.
 */
export function parseTradesCsv(text: string): Trade[] {
  const lines = text.split(/\r?\n/)
  if (lines.length < 2) return []

  // Find header indices (case-insensitive, trimmed)
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
  const idx = {
    symbol: headers.indexOf("symbol"),
    isin: headers.indexOf("isin"),
    trade_date: headers.indexOf("trade_date"),
    exchange: headers.indexOf("exchange"),
    segment: headers.indexOf("segment"),
    series: headers.indexOf("series"),
    trade_type: headers.indexOf("trade_type"),
    auction: headers.indexOf("auction"),
    quantity: headers.indexOf("quantity"),
    price: headers.indexOf("price"),
    trade_id: headers.indexOf("trade_id"),
    order_id: headers.indexOf("order_id"),
    order_execution_time: headers.indexOf("order_execution_time"),
  }

  const required = [
    "symbol",
    "isin",
    "trade_date",
    "exchange",
    "segment",
    "series",
    "trade_type",
    "auction",
    "quantity",
    "price",
    "trade_id",
    "order_id",
    "order_execution_time",
  ] as const
  if (required.some((k) => idx[k] === -1)) return []

  const trades: Trade[] = []
  let id = 1

  function parseTradeType(raw: string): Trade["trade_type"] | null {
    const normalized = raw.trim().toLowerCase()
    if (normalized === "buy" || normalized === "sell") return normalized
    return null
  }

  function parseBoolean(raw: string): boolean | null {
    const normalized = raw.trim().toLowerCase()
    if (["true", "1", "yes", "y"].includes(normalized)) return true
    if (["false", "0", "no", "n"].includes(normalized)) return false
    return null
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = line.split(",")
    const rawTradeType = cols[idx.trade_type]?.trim() ?? ""
    const tradeType = parseTradeType(rawTradeType)
    if (!tradeType) continue

    const rawAuction = cols[idx.auction]?.trim() ?? ""
    const auction = parseBoolean(rawAuction)
    if (auction === null) continue

    const quantity = Math.round(parseFloat(cols[idx.quantity]))
    const price = roundAmount(parseFloat(cols[idx.price]))

    if (isNaN(quantity) || isNaN(price)) continue

    const symbol = cols[idx.symbol]?.trim()
    const isin = cols[idx.isin]?.trim()
    const trade_date = cols[idx.trade_date]?.trim()
    const exchange = cols[idx.exchange]?.trim()
    const segment = cols[idx.segment]?.trim()
    const series = cols[idx.series]?.trim()
    const trade_id = cols[idx.trade_id]?.trim()
    const order_id = cols[idx.order_id]?.trim()
    const order_execution_time = cols[idx.order_execution_time]?.trim()

    if (
      !symbol ||
      !isin ||
      !trade_date ||
      !exchange ||
      !segment ||
      !trade_id ||
      !order_id ||
      !order_execution_time
    ) {
      continue
    }

    trades.push({
      id: id++,
      symbol,
      isin,
      trade_date,
      exchange,
      segment,
      series,
      trade_type: tradeType,
      auction,
      quantity,
      price,
      trade_id,
      order_id,
      order_execution_time,
    })
  }

  return trades
}
