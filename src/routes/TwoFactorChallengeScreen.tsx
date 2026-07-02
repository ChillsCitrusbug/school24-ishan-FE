import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout, Button, Banner } from '@/components'
import { useAuth } from '@/features/auth/useAuth'
import { resendCode } from '@/features/two-factor/api'
import { extractErrorMessage } from '@/lib/api-error'
import { ROLE_HOME_PATH } from './roleHome'

const CODE_LENGTH = 6

/**
 * Sc100TwoFactor.tsx — Two-Factor Challenge, login (FR-050). 6 separate
 * digit boxes, matching the approved mock's own inline pattern exactly —
 * no dedicated OTP component exists in either the design repo or this
 * app's own component library (field-reconciliation "Matched" section).
 *
 * `hasPendingTwoFactorChallenge` guards this screen the same way
 * StudentFirstLoginScreen guards itself against direct navigation with
 * no pending change_token — visiting this URL with nothing in flight
 * (e.g. a bookmark, a page reload) redirects back to /login rather than
 * rendering a dead form.
 */
export function TwoFactorChallengeScreen() {
  const {
    hasPendingTwoFactorChallenge,
    pendingTwoFactorChallengeToken,
    completeTwoFactorChallenge,
    completeTwoFactorBackupCode,
    isAuthenticating,
  } = useAuth()
  const navigate = useNavigate()

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [error, setError] = useState<string | null>(null)
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [backupCode, setBackupCode] = useState('')
  const [resent, setResent] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    setDigits((prev) => {
      const next = [...prev]
      next[index] = digit
      return next
    })
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleDigitKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const user = await completeTwoFactorChallenge(digits.join(''))
      navigate(ROLE_HOME_PATH[user.role], { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err, 'That code is incorrect or has expired. Please try again.'))
      setDigits(Array(CODE_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    }
  }

  async function handleVerifyBackupCode(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const user = await completeTwoFactorBackupCode(backupCode)
      navigate(ROLE_HOME_PATH[user.role], { replace: true })
    } catch (err) {
      setError(
        extractErrorMessage(err, 'That backup code is incorrect or has already been used.'),
      )
    }
  }

  async function handleResend() {
    if (!pendingTwoFactorChallengeToken) return
    setError(null)
    setResent(false)
    try {
      await resendCode(pendingTwoFactorChallengeToken)
      setResent(true)
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to resend the code. Please try again.'))
    }
  }

  useEffect(() => {
    if (!hasPendingTwoFactorChallenge) {
      navigate('/login', { replace: true })
    }
  }, [hasPendingTwoFactorChallenge, navigate])

  if (!hasPendingTwoFactorChallenge) {
    return null
  }

  return (
    <AuthLayout
      footer={
        !useBackupCode && (
          <button
            type="button"
            onClick={() => setUseBackupCode(true)}
            className="font-semibold text-brand-deep hover:text-brand"
          >
            Lost your device? Use a backup code
          </button>
        )
      }
    >
      <h1 className="text-2xl font-bold text-ink">Two-factor authentication</h1>

      {!useBackupCode ? (
        <>
          <p className="mt-1 text-sm text-muted">Enter the 6-digit code we emailed you.</p>
          {error && (
            <div className="mt-4">
              <Banner tone="danger">{error}</Banner>
            </div>
          )}
          {resent && !error && (
            <div className="mt-4">
              <Banner tone="success">We&apos;ve sent you a new code.</Banner>
            </div>
          )}
          <form onSubmit={handleVerify} className="mt-5 space-y-4">
            <div className="flex justify-between gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  aria-label={`Digit ${index + 1}`}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(index, e)}
                  className="h-12 w-12 rounded-control border border-line text-center text-lg font-semibold text-ink focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              ))}
            </div>
            <Button type="submit" fullWidth disabled={isAuthenticating || digits.some((d) => !d)}>
              {isAuthenticating ? 'Verifying…' : 'Verify & continue'}
            </Button>
            <Button type="button" variant="secondary" fullWidth onClick={handleResend}>
              Resend code
            </Button>
          </form>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">Enter one of your backup recovery codes.</p>
          {error && (
            <div className="mt-4">
              <Banner tone="danger">{error}</Banner>
            </div>
          )}
          <form onSubmit={handleVerifyBackupCode} className="mt-5 space-y-4">
            <input
              type="text"
              aria-label="Backup code"
              placeholder="xxxx-xxxx"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
              className="w-full rounded-control border border-line px-3 py-2 text-center font-mono text-sm text-ink focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/30"
              required
            />
            <Button type="submit" fullWidth disabled={isAuthenticating || !backupCode}>
              {isAuthenticating ? 'Verifying…' : 'Verify & continue'}
            </Button>
            <Button type="button" variant="secondary" fullWidth onClick={() => setUseBackupCode(false)}>
              Use my emailed code instead
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  )
}
