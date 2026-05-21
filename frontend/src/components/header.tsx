import { LogOut, Moon, Sun } from "lucide-react"
import { Link, useLocation } from "react-router"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "@/hooks/use-theme"
import { useAuth } from "@/hooks/use-auth"
import logo from "@/assets/zault_logo.png"

const NAV_LINKS = [
  { to: "/", label: "Portfolio" },
  { to: "/tradebook", label: "Tradebook" },
  { to: "/analysis", label: "Analysis" },
] as const

interface HeaderProps {
  onLogout?: () => void
}

export function Header({ onLogout }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()
  const location = useLocation()

  return (
    <header className="relative flex w-full items-center justify-between px-14 py-10">
      <Link to={user ? "/" : "/login"} className="sketch-lines sketch-lines-sm !p-0 flex items-center gap-2">
        <img src={logo} alt="" className="h-8 w-auto" />
        <span className="text-2xl font-black tracking-tight">Zault</span>
      </Link>

      {user && (
        <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1">
          {NAV_LINKS.map(({ to, label }) => {
            const isActive = location.pathname === to
            return (
              <Button
                key={to}
                variant="ghost"
                size="sm"
                asChild
                className={isActive ? "bg-foreground text-background hover:bg-foreground hover:text-background" : ""}
              >
                <Link to={to}>[ {label} ]</Link>
              </Button>
            )
          })}
        </nav>
      )}

      <div className="flex items-center gap-2">
        {onLogout && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative z-10"
                  onClick={onLogout}
                  aria-label="Log out"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Logout</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {theme === "dark" ? "Light" : "Dark"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  )
}

