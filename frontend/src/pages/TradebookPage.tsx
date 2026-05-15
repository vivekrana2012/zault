import { useNavigate } from "react-router"
import { Header } from "@/components/header"
import { useAuth } from "@/hooks/use-auth"
import { useCurrency } from "@/hooks/use-currency"
import { useTrades } from "@/hooks/use-trades"
import { AllocationDonut } from "@/components/allocation-donut"
import { CurrencySelect } from "@/components/currency-select"
import { CsvUpload } from "@/components/csv-upload"
import { TradesTable } from "@/components/trades-table"
import { PaginationBar } from "@/components/pagination-bar"

export default function TradebookPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { currency, setCurrency } = useCurrency()
  const {
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
  } = useTrades()

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header onLogout={handleLogout} />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-8">
        {/* Currency selector */}
        <div className="mb-6 flex items-center justify-end">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Currency:</span>
            <CurrencySelect value={currency} onChange={setCurrency} />
          </div>
        </div>

        {/* CSV Upload */}
        <div className="mb-24">
          <CsvUpload
            onAddFiles={addCsvFiles}
            uploadedFiles={uploadedFiles}
            totalRows={totalRows}
            onRemoveFile={removeCsvFile}
            onClearAll={clearAll}
          />
        </div>

        {/* Main content: donut + table */}
        <div className="sketch-lines grid gap-8 md:grid-cols-[minmax(auto,_420px)_1fr]">
          {/* Donut */}
          <div className="flex items-start justify-center md:sticky md:top-8 md:self-start">
            <AllocationDonut
              holdings={donutData}
              total={totalTraded}
              currency={currency}
            />
          </div>

          {/* Table */}
          <div className="min-w-0">
            <h2 className="mb-4 text-lg font-semibold">
              <span className="text-muted-foreground mr-2">##</span>
              Tradebook
            </h2>
            <TradesTable trades={pagedTrades} currency={currency} />
            {trades.length > 0 && (
              <PaginationBar
                page={page}
                totalPages={totalPages}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
