import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { apiGet, apiPost, type MeResponse, type LoginResponse, type LoginRequest } from "@/lib/api"

interface AuthState {
  user: MeResponse | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginRequest) => Promise<{ ok: boolean; error: string | null }>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  const refresh = useCallback(async () => {
    const result = await apiGet<MeResponse>("/api/auth/me")
    if (result.ok && result.data) {
      setState({ user: result.data, loading: false })
    } else {
      setState({ user: null, loading: false })
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (credentials: LoginRequest) => {
    const result = await apiPost<LoginResponse>("/api/auth/login", credentials)
    if (result.ok && result.data) {
      await refresh()
      return { ok: true, error: null }
    }
    return { ok: false, error: result.error }
  }, [refresh])

  const logout = useCallback(async () => {
    await apiPost("/api/auth/logout")
    setState({ user: null, loading: false })
  }, [])

  return (
    <AuthContext value={{ ...state, login, logout, refresh }}>
      {children}
    </AuthContext>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
