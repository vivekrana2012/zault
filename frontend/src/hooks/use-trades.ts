import { useState, useMemo, useCallback, useEffect } from "react"
import type { Trade } from "@/types/trades"
import { parseTradesCsv } from "@/lib/parse-trades-csv"
import { tradesToDonut } from "@/lib/trades-to-donut"

const PAGE_SIZE = 20

export interface UploadedCsvFile {
  id: string
  name: string
  rowCount: number
  trades: Trade[]
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(String(e.target?.result ?? ""))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export function useTrades() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedCsvFile[]>([])
  const [page, setPage] = useState(1)

  // Rows are treated as pre-deduped; we append all parsed rows across files.
  const trades = useMemo(
    () =>
      uploadedFiles
        .flatMap((file) => file.trades)
        .map((trade, index) => ({ ...trade, id: index + 1 })),
    [uploadedFiles],
  )

  const { donutData, total: totalTraded } = useMemo(() => tradesToDonut(trades), [trades])

  const totalPages = Math.max(1, Math.ceil(trades.length / PAGE_SIZE))

  const pagedTrades = useMemo(
    () => trades.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [trades, page],
  )

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const addCsvFiles = useCallback(async (files: File[]) => {
    const csvFiles = files.filter(
      (file) => file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv",
    )
    if (csvFiles.length === 0) return

    const parsedFiles = await Promise.all(
      csvFiles.map(async (file) => {
        const text = await readFileText(file)
        const parsedTrades = parseTradesCsv(text)
        return {
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          rowCount: parsedTrades.length,
          trades: parsedTrades,
        }
      }),
    )

    setUploadedFiles((prev) => [...prev, ...parsedFiles])
    setPage(1)
  }, [])

  const removeCsvFile = useCallback((fileId: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId))
    setPage(1)
  }, [])

  const clearAll = useCallback(() => {
    setUploadedFiles([])
    setPage(1)
  }, [])

  return {
    uploadedFiles,
    trades,
    donutData,
    totalTraded,
    totalRows: trades.length,
    page,
    totalPages,
    pagedTrades,
    setPage,
    addCsvFiles,
    removeCsvFile,
    clearAll,
  }
}
