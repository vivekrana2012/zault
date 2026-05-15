import { useNavigate } from "react-router"
import { Header } from "@/components/header"
import { useAuth } from "@/hooks/use-auth"
import { useHoldings } from "@/hooks/use-holdings"
import { AllocationDonut } from "@/components/allocation-donut"
import { HoldingsTable } from "@/components/holdings-table"
import { CurrencySelect } from "@/components/currency-select"

export default function HomePage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const {
    holdings,
    totalAmount,
    currency,
    setCurrency,
    addHolding,
    updateHolding,
    deleteHolding,
    usedCategories,
  } = useHoldings()

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header onLogout={handleLogout} />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-8">
        {/* Currency selector */}
        <div className="mb-8 flex items-center justify-end">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Currency:</span>
            <CurrencySelect value={currency} onChange={setCurrency} />
          </div>
        </div>

        {/* Main content: donut + table */}
        <div className="sketch-lines grid gap-8 md:grid-cols-[minmax(auto,_420px)_1fr]">
          {/* Donut */}
          <div className="flex items-start justify-center md:sticky md:top-8 md:self-start">
            <AllocationDonut
              holdings={holdings}
              total={totalAmount}
              currency={currency}
            />
          </div>

          {/* Table */}
          <div className="min-w-0">
            <h2 className="mb-4 text-lg font-semibold">
              <span className="text-muted-foreground mr-2">##</span>
              Breakdown
            </h2>
            <HoldingsTable
              holdings={holdings}
              currency={currency}
              usedCategories={usedCategories}
              onAdd={addHolding}
              onUpdate={updateHolding}
              onDelete={deleteHolding}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
