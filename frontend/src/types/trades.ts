export interface Trade {
  id: number
  symbol: string
  isin: string
  trade_date: string
  exchange: string
  segment: string
  series: string
  trade_type: "buy" | "sell"
  auction: boolean
  quantity: number
  price: number
  trade_id: string
  order_id: string
  order_execution_time: string
}
