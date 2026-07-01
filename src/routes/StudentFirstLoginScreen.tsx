import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AuthLayout, Field, Input, Button, Banner } from '@/components'
import { useStudentAuth } from '@/features/student-auth/useStudentAuth'

// Mirrors src/application/student_auth/services.py's
// _PASSWORD_MIN_LENGTH/_PASSWORD_DIGIT_RE/_PASSWORD_SYMBOL_RE exactly —
// backend stays authoritative (this is client-side UX only, review
// finding FR-002: the field-reconciliation record claimed this existed
// before it actually did).
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_DIGIT_RE = /\d/
const PASSWORD_SYMBOL_RE = /[^\w\s]|_/

function validatePassword(newPassword: string, confirmPassword: string): string | null {
  if (newPassword !== confirmPassword) {
    return 'New password and confirmation do not match.'
  }
  if (
    newPassword.length < PASSWORD_MIN_LENGTH ||
    !PASSWORD_DIGIT_RE.test(newPassword) ||
    !PASSWORD_SYMBOL_RE.test(newPassword)
  ) {
    return 'Use at least 8 characters with a number and a symbol.'
  }
  return null
}

/**
 * SC-003 · Forced First-Login Password Change — Student (FR-002).
 *
 * Reuses the approved Sc003FirstLogin.tsx structure/components as-is
 * (Step 16). No skip affordance exists in the approved design — matches
 * the ticket's own "forced gate, no skip" framing.
 */
export function StudentFirstLoginScreen() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { completePasswordChange, hasPendingPasswordChange, isAuthenticating } = useStudentAuth()
  const navigate = useNavigate()

  // Only reachable right after a first-login challenge (EC-002) — a
  // direct visit with no pending change_token bounces back to login
  // rather than rendering a form with nothing to submit against.
  if (!hasPendingPasswordChange) {
    return <Navigate to="/student-login" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const validationError = validatePassword(newPassword, confirmPassword)
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      await completePasswordChange(newPassword, confirmPassword)
      navigate('/student', { replace: true })
    } catch (err) {
      const response = (err as { response?: { status?: number; data?: { errors?: unknown } } })
        ?.response
      const message = response?.data?.errors

      // Review finding, FR-002: a genuinely expired/invalid change_token
      // (401 — the student sat on this screen past the 15-minute window)
      // previously left the student stuck re-submitting against a dead
      // token with no way out. A 401 here can only mean the change_token
      // itself is no longer valid — sending them back to sign in again
      // (which issues a fresh one) is the only real recovery.
      if (response?.status === 401) {
        navigate('/student-login', {
          replace: true,
          state: { message: 'That took too long — please sign in again to set your password.' },
        })
        return
      }

      setError(typeof message === 'string' ? message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-ink">Set your password</h1>
      <p className="mt-1 text-sm text-muted">Choose a new password to replace your temporary one.</p>

      <div className="mt-4">
        <Banner tone="info">
          For your security, you’ll need to set a new password before you can continue.
        </Banner>
      </div>

      {error && (
        <div className="mt-4">
          <Banner tone="danger">{error}</Banner>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field label="New password" hint="Use at least 8 characters with a number and a symbol.">
          <Input
            type="password"
            leadingIcon="lock"
            placeholder="••••••••"
            invalid={!!error}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
        <Field label="Confirm new password">
          <Input
            type="password"
            leadingIcon="lock"
            placeholder="••••••••"
            invalid={!!error}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
        <Button type="submit" fullWidth disabled={isAuthenticating}>
          {isAuthenticating ? 'Saving…' : 'Save and continue'}
        </Button>
      </form>
    </AuthLayout>
  )
}
