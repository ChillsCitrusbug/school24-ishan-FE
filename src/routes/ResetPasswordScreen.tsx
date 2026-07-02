import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout, Field, Input, Button, Icon, Banner } from '@/components'
import { resetPassword } from '@/features/password-reset/api'
import { extractErrorMessage } from '@/lib/api-error'

/**
 * SC-008 · Reset Password — Set New (via link) — PA/SA/Staff/Parent (FR-005).
 *
 * Reuses the approved Sc008Reset.tsx structure/components as-is (Step
 * 16). No pre-check/peek endpoint exists for this ticket (unlike FR-003's
 * activation, which shows a disabled pre-filled email field) — the
 * approved 'default' state has no email field to pre-fill, so the form
 * renders immediately if a token is present, and only switches to the
 * approved 'invalid' state on an actual rejected submit (404/409/422) —
 * a missing token in the URL at all goes straight to 'invalid' too, per
 * EC-005's "malformed" case.
 */
export function ResetPasswordScreen() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const [showInvalid, setShowInvalid] = useState(!token)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      await resetPassword(token ?? '', password, confirmPassword)
      navigate('/login', { replace: true })
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404 || status === 409 || status === 422) {
        setShowInvalid(true)
      } else {
        setError(extractErrorMessage(err, 'Use at least 8 characters with a number and a symbol.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showInvalid) {
    return (
      <AuthLayout>
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-danger-soft text-danger">
            <Icon name="alert" className="h-8 w-8" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-ink">This reset link is invalid</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            The link may have expired or already been used. Request a new one to continue.
          </p>
          <Button className="mt-6" fullWidth onClick={() => navigate('/forgot-password')}>
            Request a new link
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-ink">Set a new password</h1>
      <p className="mt-1 text-sm text-muted">Choose a new password for your account.</p>

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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save password'}
        </Button>
      </form>
    </AuthLayout>
  )
}
