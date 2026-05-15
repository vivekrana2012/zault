import { useState, type FormEvent } from "react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { BracketButton } from "@/components/bracket-button"
import { AuthPageLayout } from "@/components/auth-page-layout"
import { FormField } from "@/components/form-field"
import { FormError } from "@/components/form-error"
import { SubmitButton } from "@/components/submit-button"
import { apiPost, type RegisterResponse } from "@/lib/api"

export default function RegisterPage() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      const result = await apiPost<RegisterResponse>(
        "/api/auth/register",
        {
          username: username.trim(),
          email: email.trim(),
          displayName: displayName.trim() || undefined,
          password,
        },
      )

      if (!result.ok) {
        setError(result.error ?? "Registration failed")
        return
      }

      setSuccess(true)
    } catch {
      setError("Unable to connect to server. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthPageLayout title="Registered">
        <div className="flex items-center justify-center p-3 text-sm font-bold text-gain">
          <span>Account created. An admin must verify your email before full access is granted.</span>
        </div>
        <div className="flex justify-end">
          <Link to="/login">
            <BracketButton label="Go to Login" />
          </Link>
        </div>
      </AuthPageLayout>
    )
  }

  return (
    <AuthPageLayout title="Register">
      <form onSubmit={handleSubmit} className="space-y-8">
        {error && <FormError message={error} />}
        <FormField
          label="Username"
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          required
          minLength={3}
          maxLength={50}
          pattern="^[a-z0-9_]+$"
          title="Lowercase letters, numbers, and underscores only"
          hint="lowercase letters, numbers, and underscores only"
          autoComplete="username"
          disabled={loading}
        />
        <FormField
          label="Email"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={255}
          autoComplete="email"
          disabled={loading}
        />
        <FormField
          label="Display Name"
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={100}
          autoComplete="name"
          disabled={loading}
        />
        <FormField
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          hint="min 8 chars, one uppercase, one symbol [!@#$%&]"
          disabled={loading}
        />
        <div className="space-y-1">
          <FormField
            label="Confirm Password"
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={loading}
          />
          {passwordMismatch && (
            <p className="text-sm font-bold text-destructive text-center mt-4">
              Passwords do not match
            </p>
          )}
        </div>
        <div className="flex items-center justify-between mt-12">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Back to Login</Link>
          </Button>
          <SubmitButton
            loading={loading}
            disabled={passwordMismatch}
            label="Register"
            loadingLabel="Creating…"
          />
        </div>
      </form>
    </AuthPageLayout>
  )
}
