import { useMemo } from "react"
import { useNavigate } from "react-router"
import { Header } from "@/components/header"
import { useAuth } from "@/hooks/use-auth"
import { useCurrency } from "@/hooks/use-currency"
import { useTrades } from "@/hooks/use-trades"
import { AllocationDonut } from "@/components/allocation-donut"
import { AllocationTable } from "@/components/allocation-table"
import { CurrencySelect } from "@/components/currency-select"
import { BracketButton } from "@/components/bracket-button"
import { CsvUpload } from "@/components/csv-upload"
import { TradebookSection } from "@/components/tradebook-section"
import { bundleSmallSlices } from "@/lib/bundle-small-slices"

export default function TradebookPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { currency, setCurrency } = useCurrency()
  const {
    uploadedFiles,
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
    error,
    errorDetails,
    clearError,
  } = useTrades()

  const donutSlices = useMemo(() => bundleSmallSlices(donutData), [donutData])

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
          {error && (
            <div className="mb-4 bg-white/50 dark:bg-black px-4 py-3 text-sm text-loss shadow-md dark:text-loss">
              <div className="flex items-center justify-between">
                <span>{error}</span>
                <BracketButton variant="ghost" label="Dismiss" onClick={clearError} className="ml-4 text-foreground" />
              </div>
              {errorDetails.length > 0 && (
                <ul className="mt-2 list-none space-y-1 text-xs text-muted-foreground">
                  {errorDetails.map((detail, i) => (
                    <li key={i}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <CsvUpload
            onAddFiles={addCsvFiles}
            uploadedFiles={uploadedFiles}
            totalRows={totalRows}
            onRemoveFile={removeCsvFile}
            onClearAll={clearAll}
          />
        </div>

        {/* Allocation: donut + aggregate table */}
        <div className="sketch-lines grid gap-12 pt-4 pl-6 md:grid-cols-[minmax(auto,_420px)_1fr]">
          <div className="flex items-start justify-center md:self-start">
            <AllocationDonut
              holdings={donutSlices}
              total={totalTraded}
              currency={currency}
            />
          </div>
          <div className="min-w-0">
            <h2 className="mb-4 text-lg font-semibold">
              <span className="text-muted-foreground mr-2">##</span>
              Allocation - Current Status
            </h2>
            <AllocationTable
              data={donutData}
              total={totalTraded}
              currency={currency}
            />
          </div>
        </div>

        {/* Tradebook trades table */}
        <TradebookSection
          trades={pagedTrades}
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          currency={currency}
          hasData={totalRows > 0}
        />
      </main>
    </div>
  )
}
