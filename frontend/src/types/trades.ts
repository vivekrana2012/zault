export interface Trade {
  id: number
  date: string
  asset: string
  type: "BUY" | "SELL"
  quantity: number
  price: number
  total: number
}
