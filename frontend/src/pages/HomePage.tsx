import { useNavigate } from "react-router"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

export default function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
        <h1 className="text-3xl font-bold">Welcome, {user?.displayName ?? user?.username}</h1>
        <p className="text-muted-foreground">Your investment dashboard is coming soon.</p>
        <Button variant="outline" onClick={handleLogout}>
          Log out
        </Button>
      </main>
    </div>
  )
}
