import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout, Field, Input, Button, Banner } from '@/components'
import { useStudentAuth } from '@/features/student-auth/useStudentAuth'
import { extractErrorMessage } from '@/lib/api-error'

/**
 * SC-002 · Student Login (Student ID & Password) — Student (FR-002).
 *
 * Reuses the approved Sc002StudentLogin.tsx structure/components as-is;
 * the only delta is real state, the submit handler, and routing (per
 * Step 16 — "reuse the approved component + only the delta").
 */
export function StudentLoginScreen() {
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { login, isAuthenticating } = useStudentAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Review finding, FR-002: an expired change_token on the first-login
  // screen now bounces here with an explanatory message (navigation
  // state) instead of leaving the student stuck on a dead-token form.
  const infoMessage = (location.state as { message?: string } | null)?.message ?? null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const result = await login(studentId, password)
      if ('must_change_password' in result) {
        // EC-002: forced first-login gate — no feature access yet.
        navigate('/student-first-login', { replace: true })
      } else {
        navigate('/student', { replace: true })
      }
    } catch (err) {
      const response = (err as { response?: { status?: number } })?.response

      // SC-013 (Blocked) explicitly covers Student, matching FR-001's
      // deactivated-account handling — a distinct outcome from "wrong
      // credentials", not squeezed into the login form's inline banner.
      if (response?.status === 403) {
        navigate('/blocked', { replace: true, state: { identityKind: 'student' } })
        return
      }

      // Bug report: a CORS/network failure (no response at all) was
      // showing "That Student ID or password isn't right" regardless of
      // the real cause — extractErrorMessage only shows that specific
      // text when the server actually said it.
      setError(extractErrorMessage(err, "That Student ID or password isn't right. Try again."))
    }
  }

  return (
    <AuthLayout
      footer={
        <>
          Parent or staff?{' '}
          <a href="#" className="font-semibold text-brand-deep hover:text-brand">
            Sign in here
          </a>
        </>
      }
    >
      <h1 className="text-2xl font-bold text-ink">Student sign in</h1>
      <p className="mt-1 text-sm text-muted">Use the Student ID and password from your school.</p>

      {infoMessage && !error && (
        <div className="mt-4">
          <Banner tone="info">{infoMessage}</Banner>
        </div>
      )}

      {error && (
        <div className="mt-4">
          <Banner tone="danger">{error}</Banner>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field label="Student ID">
          <Input
            leadingIcon="user"
            placeholder="e.g. S-40231"
            invalid={!!error}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            autoComplete="username"
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
        <Banner tone="info">
          Forgot your password? Ask your teacher or the school office — they’ll reset it for you.
        </Banner>
        <Button type="submit" fullWidth disabled={isAuthenticating}>
          {isAuthenticating ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
