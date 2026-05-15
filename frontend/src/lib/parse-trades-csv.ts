import type { Trade } from "@/types/trades"

/**
 * Parses a CSV string into an array of Trade objects.
 * Expected header (case-insensitive): date,asset,type,quantity,price,total
 * Malformed or blank rows are silently skipped.
 */
export function parseTradesCsv(text: string): Trade[] {
  const lines = text.split(/\r?\n/)
  if (lines.length < 2) return []

  // Find header indices (case-insensitive, trimmed)
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
  const idx = {
    date: headers.indexOf("date"),
    asset: headers.indexOf("asset"),
    type: headers.indexOf("type"),
    quantity: headers.indexOf("quantity"),
    price: headers.indexOf("price"),
    total: headers.indexOf("total"),
  }

  const required = ["date", "asset", "type", "quantity", "price", "total"] as const
  if (required.some((k) => idx[k] === -1)) return []

  const trades: Trade[] = []
  let id = 1

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = line.split(",")
    const rawType = cols[idx.type]?.trim().toUpperCase()
    if (rawType !== "BUY" && rawType !== "SELL") continue

    const quantity = parseFloat(cols[idx.quantity])
    const price = parseFloat(cols[idx.price])
    const total = parseFloat(cols[idx.total])

    if (isNaN(quantity) || isNaN(price) || isNaN(total)) continue

    const date = cols[idx.date]?.trim()
    const asset = cols[idx.asset]?.trim()
    if (!date || !asset) continue

    trades.push({ id: id++, date, asset, type: rawType, quantity, price, total })
  }

  return trades
}
