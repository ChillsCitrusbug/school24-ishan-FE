import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SystemPage, Button } from '@/components'
import { verifyEmail } from '@/features/registration/api'
import { extractErrorMessage } from '@/lib/api-error'

type Status = 'checking' | 'success' | 'error'

// Review finding, FR-004 (Nit): a `useRef` guard doesn't survive React 18
// StrictMode's dev-only mount->unmount->remount cycle (refs reset on
// remount same as state), so it double-fires this single-use redemption
// call in local dev — the first (discarded) call wins, and the second
// sees a false "already used" error on the very first click. A
// module-level cache (outside the component, so it survives remounts)
// dedupes by token value instead. Harmless in production, where
// StrictMode's double-invoke never happens.
const _verifiedTokens = new Map<string, ReturnType<typeof verifyEmail>>()

/**
 * Email-verification link landing page — Parent (FR-004).
 *
 * The emailed link points at this FE route (`?token=...`); this screen
 * reads the token and calls the API itself rather than the backend
 * rendering HTML directly (no precedent anywhere in this SPA architecture
 * for a backend-rendered page — see field-reconciliation item 5). No
 * approved screen exists for this outcome either — same SystemPage reuse
 * as RegistrationSentPage.
 */
export function VerifyEmailScreen() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<Status>('checking')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('This verification link is invalid.')
      return
    }

    let cancelled = false
    const request = _verifiedTokens.get(token) ?? verifyEmail(token)
    _verifiedTokens.set(token, request)
    request
      .then((result) => {
        if (cancelled) return
        setStatus('success')
        setMessage(result.message)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setStatus('error')
        setMessage(extractErrorMessage(err, 'This verification link is invalid.'))
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (status === 'checking') {
    return <SystemPage icon="clock" tone="brand" title="Verifying…" message="One moment." />
  }

  if (status === 'success') {
    return (
      <SystemPage
        icon="check"
        tone="brand"
        title="Email verified"
        message={message}
        actions={<Button onClick={() => navigate('/login')}>Sign in</Button>}
      />
    )
  }

  return (
    <SystemPage
      icon="alert"
      tone="danger"
      title="Verification failed"
      message={message}
      actions={<Button onClick={() => navigate('/register')}>Back to registration</Button>}
    />
  )
}
