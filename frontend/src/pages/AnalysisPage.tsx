import { useNavigate } from "react-router"
import { Header } from "@/components/header"
import { useAuth } from "@/hooks/use-auth"
import { useExecutionTimes } from "@/hooks/use-execution-times"
import { BracketButton } from "@/components/bracket-button"
import { TradeTimeScatter } from "@/components/trade-time-scatter"

export default function AnalysisPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { trades, loading, fetched, fetch: fetchTimes } = useExecutionTimes()

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header onLogout={handleLogout} />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-8">
        {!fetched ? (
          <div className="mt-16">
            <BracketButton
              label={loading ? "Loading..." : "Trade Timing Pattern"}
              onClick={fetchTimes}
              disabled={loading}
            />
          </div>
        ) : (
          <div className="mt-16 sketch-lines pl-6 pt-4">
            <TradeTimeScatter trades={trades} />
          </div>
        )}
      </main>
    </div>
  )
}
