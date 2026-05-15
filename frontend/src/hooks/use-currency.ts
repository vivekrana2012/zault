import { useState } from "react"
import type { CurrencySymbol } from "@/types/holdings"

export function useCurrency(defaultCurrency: CurrencySymbol = "₹") {
  const [currency, setCurrency] = useState<CurrencySymbol>(defaultCurrency)
  return { currency, setCurrency }
}
