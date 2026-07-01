import { useNavigate } from 'react-router-dom'
import { SystemPage, Button } from '@/components'
import { useAuth } from '@/features/auth/useAuth'

/** SC-009 · 404 Not Found — All. */
export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <SystemPage
      code="404"
      title="Page not found"
      message="The page you’re looking for doesn’t exist or has moved."
      actions={<Button onClick={() => navigate('/')}>Back to home</Button>}
    />
  )
}

/** SC-010 · 500 Server Error — All. */
export function ServerErrorPage() {
  const navigate = useNavigate()
  return (
    <SystemPage
      code="500"
      title="Something went wrong"
      message="An unexpected error occurred on our side. Please try again in a moment."
      actions={
        <>
          <Button leadingIcon="arrowRight" onClick={() => window.location.reload()}>
            Try again
          </Button>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Back to home
          </Button>
        </>
      }
    />
  )
}

/** SC-011 · Maintenance — All. */
export function MaintenancePage() {
  return (
    <SystemPage
      icon="clock"
      tone="warning"
      title="We’ll be back soon"
      message="School24 is down for scheduled maintenance. Please check back shortly — your data is safe."
    />
  )
}

/**
 * SC-012 · Session Expired / Logout — All (FR-001 / EC-034).
 * Reached automatically by the API client's response interceptor on a 401
 * from any authenticated call — see src/api/client.ts.
 */
export function SessionExpiredPage({ state = 'expired' }: { state?: 'expired' | 'logged-out' }) {
  const navigate = useNavigate()
  const out = state === 'logged-out'
  return (
    <SystemPage
      icon={out ? 'check' : 'clock'}
      tone={out ? 'brand' : 'warning'}
      title={out ? 'You’re signed out' : 'Your session expired'}
      message={
        out
          ? 'Thanks for using School24. Sign in again whenever you’re ready.'
          : 'For your security, you’ve been signed out after a period of inactivity.'
      }
      actions={<Button onClick={() => navigate('/login')}>Sign in</Button>}
    />
  )
}

/** SC-013 · Account Deactivated / School Suspended — SA/Staff/Parent/Student (FR-001). */
export function BlockedPage({ state = 'deactivated' }: { state?: 'deactivated' | 'suspended' }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const susp = state === 'suspended'

  function handleSignOut() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <SystemPage
      icon="lock"
      tone="danger"
      title={susp ? 'School access suspended' : 'Account deactivated'}
      message={
        susp
          ? 'Greenvale Primary’s access to School24 is currently suspended. Please contact the platform operator.'
          : 'Your account has been deactivated. Contact your school office if you think this is a mistake.'
      }
      actions={
        <>
          <Button>Contact {susp ? 'operator' : 'school'}</Button>
          <Button variant="secondary" onClick={handleSignOut}>
            Sign out
          </Button>
        </>
      }
    />
  )
}
