import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { AuthPageLayout } from "@/components/auth-page-layout"
import { FormField } from "@/components/form-field"
import { FormError } from "@/components/form-error"
import { SubmitButton } from "@/components/submit-button"
import { useAuth } from "@/hooks/use-auth"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await login({ username: username.trim(), password })

      if (!result.ok) {
        setError(result.error ?? "Invalid credentials")
        return
      }

      navigate("/")
    } catch {
      setError("Unable to connect to server. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageLayout title="Login">
      <form onSubmit={handleSubmit} className="space-y-8">
        {error && <FormError message={error} />}
        <FormField
          label="Username"
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
          disabled={loading}
        />
        <FormField
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          disabled={loading}
        />
        <div className="flex items-center justify-between mt-12">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/register">create an account?</Link>
          </Button>
          <SubmitButton loading={loading} label="Login" loadingLabel="Signing in…" />
        </div>
      </form>
    </AuthPageLayout>
  )
}
