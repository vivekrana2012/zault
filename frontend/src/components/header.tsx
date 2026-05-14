import { Moon, Sun } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/use-theme"
import { useAuth } from "@/hooks/use-auth"
import logo from "@/assets/zault_logo.png"

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()

  return (
    <header className="flex w-full items-center justify-between px-14 py-10">
      <Link to={user ? "/" : "/login"} className="sketch-lines sketch-lines-sm !p-0 flex items-center gap-2">
        <img src={logo} alt="" className="h-8 w-auto" />
        <span className="text-2xl font-black tracking-tight">Zault</span>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="relative z-10"
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>
    </header>
  )
}
