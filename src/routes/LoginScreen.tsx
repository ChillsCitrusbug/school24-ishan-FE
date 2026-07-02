import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout, Field, Input, Button, Banner } from '@/components'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { ROLE_HOME_PATH } from './roleHome'

/**
 * SC-001 · Login (Email & Password) — PA/SA/Staff/Parent (FR-001).
 *
 * Reuses the approved Sc001Login.tsx structure/components as-is; the only
 * delta is real state, the submit handler, and role-based post-login
 * navigation — per Step 16 ("reuse the approved component + only the
 * delta... never invent UI").
 */
export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { login, isAuthenticating } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const user = await login(email, password)
      // Scenario 1: route to the role-specific home immediately — using
      // the function's return value, not context state, since the
      // context hasn't re-rendered yet inside this same handler.
      navigate(ROLE_HOME_PATH[user.role], { replace: true })
    } catch (err) {
      const response = (err as { response?: { status?: number; data?: { errors?: unknown } } })
        ?.response
      const message = response?.data?.errors
      const messageText = typeof message === 'string' ? message : ''

      // Deactivated account only: a distinct outcome from "wrong
      // credentials" with its own approved screen (SC-013). Matched by
      // message content (review finding, FR-001) rather than status code
      // alone — a 403 for the pending-verification check (dbml's own
      // users.status note, not in FR-001's own stated DoD) is a DIFFERENT
      // case with no matching approved screen state yet, so it must NOT
      // be told "deactivated" (that would be factually wrong); it falls
      // through to the inline banner below instead, same as a 401.
      if (response?.status === 403 && messageText.toLowerCase().includes('deactivated')) {
        navigate('/blocked', { replace: true, state: { identityKind: 'user' } })
        return
      }

      // Bug report: a CORS/network failure (no response at all) was
      // showing "The email or password is incorrect" regardless of the
      // real cause — extractErrorMessage only shows that specific text
      // when the server actually said it.
      setError(extractErrorMessage(err, 'The email or password is incorrect. Please try again.'))
    }
  }

  return (
    <AuthLayout
      footer={
        <>
          New parent?{' '}
          <Link to="/register" className="font-semibold text-brand-deep hover:text-brand">
            Create an account
          </Link>
        </>
      }
    >
      <h1 className="text-2xl font-bold text-ink">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Sign in to manage your family’s canteen.</p>

      {error && (
        <div className="mt-4">
          <Banner tone="danger">{error}</Banner>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field label="Email">
          <Input
            type="email"
            leadingIcon="user"
            placeholder="you@example.com"
            invalid={!!error}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            leadingIcon="lock"
            placeholder="••••••••"
            invalid={!!error}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-muted">
            <input type="checkbox" className="h-4 w-4 accent-brand" /> Remember me
          </label>
          <a href="#" className="font-semibold text-brand-deep hover:text-brand">
            Forgot password?
          </a>
        </div>
        <Button type="submit" fullWidth disabled={isAuthenticating}>
          {isAuthenticating ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
