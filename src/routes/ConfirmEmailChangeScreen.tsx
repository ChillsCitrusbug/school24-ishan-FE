import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SystemPage, Button } from '@/components'
import { confirmEmailChange } from '@/features/profile/api'
import { extractErrorMessage } from '@/lib/api-error'

type Status = 'checking' | 'success' | 'error'

// Same StrictMode double-invoke guard as VerifyEmailScreen.tsx (FR-004
// Nit) — a module-level cache, not a `useRef`, survives the dev-only
// mount->unmount->remount cycle.
const _confirmedTokens = new Map<string, ReturnType<typeof confirmEmailChange>>()

/**
 * Email-change confirmation link landing page (FR-048's resolved Open
 * Question). Not behind auth — the token itself is the credential, and
 * the old email/session must keep working right up until this link is
 * clicked, possibly from a different device than the one that requested
 * the change. Same SystemPage/token-in-query-param pattern as
 * VerifyEmailScreen.tsx (FR-004) and ResetPasswordScreen.tsx (FR-005).
 */
export function ConfirmEmailChangeScreen() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<Status>('checking')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('This confirmation link is invalid.')
      return
    }

    let cancelled = false
    const request = _confirmedTokens.get(token) ?? confirmEmailChange(token)
    _confirmedTokens.set(token, request)
    request
      .then((result) => {
        if (cancelled) return
        setStatus('success')
        setMessage(result.message)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setStatus('error')
        setMessage(extractErrorMessage(err, 'This confirmation link is invalid.'))
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (status === 'checking') {
    return <SystemPage icon="clock" tone="brand" title="Confirming…" message="One moment." />
  }

  if (status === 'success') {
    return (
      <SystemPage
        icon="check"
        tone="brand"
        title="Email address updated"
        message={message}
        actions={<Button onClick={() => navigate('/login')}>Sign in</Button>}
      />
    )
  }

  return (
    <SystemPage
      icon="alert"
      tone="danger"
      title="Confirmation failed"
      message={message}
      actions={<Button onClick={() => navigate('/login')}>Back to sign in</Button>}
    />
  )
}
