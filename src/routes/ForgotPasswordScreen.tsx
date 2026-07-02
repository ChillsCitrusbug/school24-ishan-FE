import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout, Field, Input, Button, Icon, Banner } from '@/components'
import { requestPasswordReset } from '@/features/password-reset/api'
import { extractErrorMessage } from '@/lib/api-error'

/**
 * SC-007 · Forgot Password — Request Link — PA/SA/Staff/Parent (FR-005).
 *
 * Reuses the approved Sc007Forgot.tsx structure/components as-is (Step
 * 16). Always shows the 'sent' confirmation state on submit, regardless
 * of whether the email matched an account — the backend's own generic,
 * non-enumerating response makes this the only honest behavior (there is
 * no "email not found" case to distinguish on the frontend).
 */
export function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await requestPasswordReset(email.trim())
      setIsSent(true)
    } catch (err) {
      setError(extractErrorMessage(err, 'Something went wrong. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSent) {
    return (
      <AuthLayout
        footer={
          <Link to="/login" className="font-semibold text-brand-deep hover:text-brand">
            Back to sign in
          </Link>
        }
      >
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success-soft text-success">
            <Icon name="check" className="h-8 w-8" strokeWidth={2.2} />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-ink">Check your email</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            If an account exists for that address, we&rsquo;ve sent a link to reset your password. It expires in 30 minutes.
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      footer={
        <>
          Remembered it?{' '}
          <Link to="/login" className="font-semibold text-brand-deep hover:text-brand">
            Back to sign in
          </Link>
        </>
      }
    >
      <h1 className="text-2xl font-bold text-ink">Forgot your password?</h1>
      <p className="mt-1 text-sm text-muted">Enter your email and we&rsquo;ll send you a reset link.</p>

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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </Field>
        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </AuthLayout>
  )
}
