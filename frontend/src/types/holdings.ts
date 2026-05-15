export interface Holding {
  id: number
  category: string
  amount: number
}

export const PREDEFINED_CATEGORIES = [
  "Stocks",
  "Mutual Funds",
  "Fixed Deposits",
  "Gold",
  "Real Estate",
  "Crypto",
  "Savings Account",
  "PPF",
  "NPS",
  "Bonds",
] as const

export const CURRENCY_SYMBOLS = ["₹", "$", "€", "£", "¥"] as const

export type CurrencySymbol = (typeof CURRENCY_SYMBOLS)[number]
