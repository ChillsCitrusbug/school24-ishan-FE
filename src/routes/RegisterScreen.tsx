import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout, Field, Input, Button, Banner } from '@/components'
import { register } from '@/features/registration/api'
import { extractErrorMessage } from '@/lib/api-error'

// Mirrors src/utils/password_strength.py's exact rule — client-side UX
// only, backend stays authoritative (same pattern as FR-002's
// StudentFirstLoginScreen).
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_DIGIT_RE = /\d/
const PASSWORD_SYMBOL_RE = /[^\w\s]|_/

function isStrongPassword(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    PASSWORD_DIGIT_RE.test(password) &&
    PASSWORD_SYMBOL_RE.test(password)
  )
}

/**
 * SC-006 · Parent Self-Registration — Parent (FR-004).
 *
 * Reuses the approved Sc006Register.tsx structure/components as-is; the
 * only delta is real state, the submit handler, and routing (Step 16).
 */
export function RegisterScreen() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!isStrongPassword(password)) {
      setError('Use at least 8 characters with a number and a symbol.')
      return
    }

    setIsSubmitting(true)
    try {
      await register(fullName, email, mobile, password)
      // No approved SC-006 "sent" state exists (unlike SC-007) — reuses
      // the generic system-page pattern already established for SC-012/
      // SC-013, per docs/design/field-reconciliation/FR-004.md item 4.
      navigate('/registration-sent', { replace: true })
    } catch (err) {
      // Bug report: a CORS/network failure (no response at all) was
      // showing "An account with this email already exists" regardless
      // of the real cause — extractErrorMessage only shows that specific
      // text when the server actually said it.
      setError(
        extractErrorMessage(
          err,
          'An account with this email already exists. Try signing in instead.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-deep hover:text-brand">
            Sign in
          </Link>
        </>
      }
    >
      <h1 className="text-2xl font-bold text-ink">Create your account</h1>
      <p className="mt-1 text-sm text-muted">
        Set up a parent account to top up wallets and order canteen food.
      </p>

      {error && (
        <div className="mt-4">
          <Banner tone="danger">{error}</Banner>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field label="Full name">
          <Input
            placeholder="Sarah Thompson"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            required
          />
        </Field>
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
        <Field label="Mobile">
          <Input
            type="tel"
            placeholder="04xx xxx xxx"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            autoComplete="tel"
            required
          />
        </Field>
        <Field label="Password" hint="Use at least 8 characters with a number and a symbol.">
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
        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
