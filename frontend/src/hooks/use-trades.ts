import { useState, useCallback, useEffect } from "react"
import type { Trade } from "@/types/trades"
import type { HoldingWithPercentage } from "@/hooks/use-holdings"
import {
  apiGet,
  apiDelete,
  apiUploadFiles,
  type TradeFileDto,
  type TradesPageDto,
  type AllocationsDto,
  type AllocationDto,
} from "@/lib/api"
import { roundAmount } from "@/lib/currency"

const PAGE_SIZE = 20

export interface UploadedCsvFile {
  id: string
  name: string
  rowCount: number
}

interface UploadResultDto {
  files: { id: string; filename: string; rowCount: number; duplicatesSkipped: number; errorRows: number; errors: string[] }[]
  allocations: AllocationDto[]
  totalInvested: number
}

function allocationToHolding(alloc: AllocationDto, id: number, total: number): HoldingWithPercentage {
  const amount = roundAmount(alloc.investedAmount ?? 0)
  return {
    id,
    category: alloc.symbol ?? alloc.isin ?? "Unknown",
    amount,
    percentage: total > 0 ? (amount / total) * 100 : 0,
  }
}

function mapAllocations(allocations: AllocationDto[], totalInvested: number) {
  const total = roundAmount(totalInvested)
  const donutData: HoldingWithPercentage[] = allocations
    .map((a, i) => allocationToHolding(a, i + 1, total))
    .sort((a, b) => b.amount - a.amount)
  return { donutData, total }
}

type TradeApiDto = NonNullable<TradesPageDto["trades"]>[number]

function mapTradeDto(dto: TradeApiDto, index: number): Trade {
  return {
    id: index + 1,
    symbol: dto.symbol ?? "",
    isin: dto.isin ?? "",
    trade_date: dto.tradeDate ?? "",
    exchange: dto.exchange ?? "",
    segment: dto.segment ?? "",
    series: dto.series ?? "",
    trade_type: (dto.tradeType as "buy" | "sell") ?? "buy",
    auction: dto.auction ?? false,
    quantity: dto.quantity ?? 0,
    price: dto.price ?? 0,
    trade_id: dto.tradeId ?? "",
    order_id: dto.orderId ?? "",
    order_execution_time: dto.orderExecutionTime ?? "",
  }
}

export function useTrades() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedCsvFile[]>([])
  const [donutData, setDonutData] = useState<HoldingWithPercentage[]>([])
  const [totalTraded, setTotalTraded] = useState(0)
  const [trades, setTrades] = useState<Trade[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string[]>([])

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))

  const pagedTrades = trades

  // Fetch initial state
  const fetchFiles = useCallback(async () => {
    const result = await apiGet<TradeFileDto[]>("/api/tradebook/files")
    if (result.ok && result.data) {
      setUploadedFiles(
        result.data.map((f) => ({
          id: f.id ?? "",
          name: f.filename ?? "",
          rowCount: f.rowCount ?? 0,
        })),
      )
    }
  }, [])

  const fetchAllocations = useCallback(async () => {
    const result = await apiGet<AllocationsDto>("/api/tradebook/allocations")
    if (result.ok && result.data) {
      const { donutData: d, total } = mapAllocations(
        result.data.allocations ?? [],
        result.data.totalInvested ?? 0,
      )
      setDonutData(d)
      setTotalTraded(total)
    }
  }, [])

  const fetchTrades = useCallback(async (p: number) => {
    const result = await apiGet<TradesPageDto>(
      `/api/tradebook/trades?page=${p - 1}&size=${PAGE_SIZE}`,
    )
    if (result.ok && result.data) {
      setTrades((result.data.trades ?? []).map(mapTradeDto))
      setTotalRows(result.data.totalCount ?? 0)
    }
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([fetchFiles(), fetchAllocations(), fetchTrades(1)])
      setLoading(false)
    }
    init()
  }, [fetchFiles, fetchAllocations, fetchTrades])

  // Re-fetch trades when page changes
  useEffect(() => {
    fetchTrades(page)
  }, [page, fetchTrades])

  const addCsvFiles = useCallback(async (files: File[]) => {
    const csvFiles = files.filter(
      (file) => file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv",
    )
    if (csvFiles.length === 0) return

    setError(null)
    const result = await apiUploadFiles<UploadResultDto>("/api/tradebook/files", csvFiles)
    if (result.ok && result.data) {
      // Update allocations from response
      const { donutData: d, total } = mapAllocations(
        result.data.allocations ?? [],
        result.data.totalInvested ?? 0,
      )
      setDonutData(d)
      setTotalTraded(total)

      // Refresh files list and trades
      await fetchFiles()
      setPage(1)
      await fetchTrades(1)

      // Check if any files had errors
      const filesWithErrors = result.data.files.filter((f) => f.errorRows > 0)
      if (filesWithErrors.length > 0) {
        const totalErrors = filesWithErrors.reduce((sum, f) => sum + f.errorRows, 0)
        setError(`${totalErrors} row${totalErrors > 1 ? "s" : ""} could not be parsed.`)
        const details = filesWithErrors.flatMap((f) => f.errors ?? []).slice(0, 3)
        setErrorDetails(details)
      }
    } else if (result.error) {
      setError("An error occurred while ingesting the file.")
    }
  }, [fetchFiles, fetchTrades])

  const removeCsvFile = useCallback(async (fileId: string) => {
    const result = await apiDelete<{
      deletedTradeCount: number
      allocations: AllocationDto[]
      totalInvested: number
    }>(`/api/tradebook/files/${fileId}`)

    if (result.ok && result.data) {
      const { donutData: d, total } = mapAllocations(
        result.data.allocations ?? [],
        result.data.totalInvested ?? 0,
      )
      setDonutData(d)
      setTotalTraded(total)

      // Refresh files and trades
      await fetchFiles()
      setPage(1)
      await fetchTrades(1)
    }
  }, [fetchFiles, fetchTrades])

  const clearAll = useCallback(async () => {
    // Delete all files one by one
    for (const file of uploadedFiles) {
      await apiDelete(`/api/tradebook/files/${file.id}`)
    }
    setUploadedFiles([])
    setDonutData([])
    setTotalTraded(0)
    setTrades([])
    setTotalRows(0)
    setPage(1)
  }, [uploadedFiles])

  return {
    uploadedFiles,
    trades,
    donutData,
    totalTraded,
    totalRows,
    page,
    totalPages,
    pagedTrades,
    setPage,
    addCsvFiles,
    removeCsvFile,
    clearAll,
    loading,
    error,
    errorDetails,
    clearError: () => { setError(null); setErrorDetails([]) },
  }
}
