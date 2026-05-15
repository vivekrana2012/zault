import { useState, useCallback, useMemo, useEffect } from "react"
import type { Holding, CurrencySymbol } from "@/types/holdings"
import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  type InvestmentDto,
  type CreateInvestmentRequest,
  type UpdateInvestmentAmountRequest,
} from "@/lib/api"
import { useCurrency } from "@/hooks/use-currency"

export interface HoldingWithPercentage extends Holding {
  percentage: number
}

/** Server-state hook: fetch/create/update/delete investments via the API. */
export function useInvestments() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHoldings = useCallback(async () => {
    const result = await apiGet<InvestmentDto[]>("/api/investments")
    if (result.ok && result.data) {
      setHoldings(
        result.data.map((inv) => ({
          id: inv.id!,
          category: inv.category!,
          amount: inv.amount!,
        })),
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchHoldings()
  }, [fetchHoldings])

  const totalAmount = useMemo(
    () => holdings.reduce((sum, h) => sum + h.amount, 0),
    [holdings],
  )

  const holdingsWithPercentage: HoldingWithPercentage[] = useMemo(
    () =>
      holdings
        .map((h) => ({
          ...h,
          percentage: totalAmount > 0 ? (h.amount / totalAmount) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount),
    [holdings, totalAmount],
  )

  const addHolding = useCallback(async (category: string, amount: number) => {
    const body: CreateInvestmentRequest = { category, amount }
    const result = await apiPost("/api/investments", body)
    if (result.ok) {
      await fetchHoldings()
    }
  }, [fetchHoldings])

  const updateHolding = useCallback(async (id: number, updates: Partial<Pick<Holding, "category" | "amount">>) => {
    if (updates.amount != null) {
      const body: UpdateInvestmentAmountRequest = { amount: updates.amount }
      const result = await apiPatch(`/api/investments/${id}`, body)
      if (result.ok) {
        await fetchHoldings()
      }
    }
  }, [fetchHoldings])

  const deleteHolding = useCallback(async (id: number) => {
    const result = await apiDelete(`/api/investments/${id}`)
    if (result.ok) {
      await fetchHoldings()
    }
  }, [fetchHoldings])

  const usedCategories = useMemo(
    () => new Set(holdings.map((h) => h.category)),
    [holdings],
  )

  return {
    holdings: holdingsWithPercentage,
    totalAmount,
    addHolding,
    updateHolding,
    deleteHolding,
    usedCategories,
    loading,
  }
}

/** Composed hook used by HomePage: investments + currency selection. */
export function useHoldings(defaultCurrency?: CurrencySymbol) {
  const investments = useInvestments()
  const { currency, setCurrency } = useCurrency(defaultCurrency)
  return { ...investments, currency, setCurrency }
}
