import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout, Field, Input, Button, Banner, Icon, SystemPage } from '@/components'
import { activateAccount, getActivationInfo } from '@/features/account-activation/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { ROLE_HOME_PATH } from './roleHome'

// Mirrors src/utils/password_strength.py's exact rule — client-side UX
// only, backend stays authoritative (same pattern as FR-002/FR-004).
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_DIGIT_RE = /\d/
const PASSWORD_SYMBOL_RE = /[^\w\s]|_/

function validatePassword(password: string, confirmPassword: string): string | null {
  if (password !== confirmPassword) {
    return 'New password and confirmation do not match.'
  }
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    !PASSWORD_DIGIT_RE.test(password) ||
    !PASSWORD_SYMBOL_RE.test(password)
  ) {
    return 'Use at least 8 characters with a number and a symbol.'
  }
  return null
}

type PeekState = 'checking' | 'valid' | 'invalid'

/**
 * SC-004 · Account Activation via Invitation Link — SA/Staff (FR-003).
 *
 * Reuses the approved Sc004Activate.tsx structure/components as-is
 * (Step 16). EC-004: "System refuses to load the password-setup screen"
 * for a bad link — this screen calls the read-only activation-info peek
 * on mount and only renders the (approved) password-setup form once a
 * valid invitation is confirmed; any failure renders the approved
 * `expired` state instead (the design's own 2-state model, no 3-way
 * split invented for not-found vs used vs expired).
 */
export function ActivateAccountScreen() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [peekState, setPeekState] = useState<PeekState>('checking')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { setSession } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) {
      setPeekState('invalid')
      return
    }
    let cancelled = false
    getActivationInfo(token)
      .then((result) => {
        if (cancelled) return
        setEmail(result.email)
        setPeekState('valid')
      })
      .catch(() => {
        if (cancelled) return
        setPeekState('invalid')
      })
    return () => {
      cancelled = true
    }
  }, [token])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const validationError = validatePassword(password, confirmPassword)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    try {
      const result = await activateAccount(token ?? '', password, confirmPassword)
      // Scenario 1/2: activation issues a full session directly — same
      // challenge-then-full-access pattern as FR-002's forced password
      // change, per field-reconciliation item 6.
      setSession(result.access_token, result.user)
      navigate(ROLE_HOME_PATH[result.user.role], { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err, 'This invitation link has already been used.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (peekState === 'checking') {
    return <SystemPage icon="clock" tone="brand" title="Checking your invitation…" message="One moment." />
  }

  if (peekState === 'invalid') {
    return (
      <AuthLayout>
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-danger-soft text-danger">
            <Icon name="alert" className="h-8 w-8" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-ink">This invitation has expired</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Invitation links are valid for 7 days. Ask your school admin to send a new invite.
          </p>
          <Button className="mt-6" fullWidth>
            Request a new link
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-ink">Activate your account</h1>
      <p className="mt-1 text-sm text-muted">You’ve been invited to School24. Set a password to get started.</p>

      {error && (
        <div className="mt-4">
          <Banner tone="danger">{error}</Banner>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field label="Email">
          <Input type="email" value={email} disabled />
        </Field>
        <Field label="Create password" hint="Use at least 8 characters with a number and a symbol.">
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
        <Field label="Confirm password">
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
          {isSubmitting ? 'Activating…' : 'Activate account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
