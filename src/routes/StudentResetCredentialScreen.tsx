import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  Button,
  Card,
  Banner,
  Icon,
  ResultHero,
  Spinner,
} from '@/components'
import {
  getStudent,
  resetCredential,
  type EnrolledStudent,
  type Student,
} from '@/features/students/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * SC-099 · Reset / Re-issue Student Credential — School Admin (FR-051).
 * Reuses the approved Sc099ResetCredential.tsx structure — a single
 * confirm state, then a success state showing the new one-time
 * temporary password (same reveal convention as StudentFormScreen's
 * own create-success state). No self-service reset exists for
 * students (Sc002StudentLogin already only offers "contact your
 * school" messaging) — this is the only way a student regains access.
 *
 * Guards against an inactive student the same way
 * StudentFormScreen.tsx/StudentDeleteScreen.tsx do (field-
 * reconciliation decision #4: resetting a removed/deactivated
 * student's credential is out of scope server-side) — the Detail
 * screen already hides this action for that state, but a bookmarked/
 * typed URL must not reach a live, submittable confirm screen either.
 */
export function StudentResetCredentialScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { studentId } = useParams<{ studentId: string }>()
  const [student, setStudent] = useState<Student | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [inactiveError, setInactiveError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<EnrolledStudent | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!studentId) return
    let cancelled = false
    getStudent(studentId)
      .then((fetched) => {
        if (cancelled) return
        if (!fetched.is_active) {
          setInactiveError('This student is deactivated. Reactivate them before resetting their credential.')
          return
        }
        setStudent(fetched)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(extractErrorMessage(err, 'This student could not be found.'))
      })
    return () => {
      cancelled = true
    }
  }, [studentId])

  async function handleConfirm() {
    if (!studentId) return
    setError(null)
    setIsSubmitting(true)
    try {
      const reset = await resetCredential(studentId)
      setResult(reset)
    } catch (err) {
      setError(extractErrorMessage(err, 'This credential could not be reset.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCopy() {
    if (!result) return
    await navigator.clipboard.writeText(result.temp_password)
    setCopied(true)
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          brandSubtitle={user?.school_name ?? undefined}
          groups={schoolAdminNavGroups('students')}
          user={{
            initials: user ? initialsOf(user.full_name) : '',
            name: user?.full_name ?? '',
            role: 'School Admin',
          }}
        />
      }
      topbar={<Topbar right={<IconButton icon="bell" label="Notifications" />} />}
      mobileNav={<MobileTabBar items={schoolAdminTabs('students')} />}
    >
      <div className="mx-auto max-w-md pt-6">
        <Card className="p-6">
          {!student && !loadError && !inactiveError && (
            <div role="status" aria-label="Loading student" className="flex justify-center text-muted">
              <Spinner className="h-6 w-6" />
            </div>
          )}

          {inactiveError && <Banner tone="warning">{inactiveError}</Banner>}
          {loadError && <Banner tone="danger">{loadError}</Banner>}

          {student && !result && (
            <div className="text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-warning-soft text-warning">
                <Icon name="lock" className="h-8 w-8" strokeWidth={1.8} />
              </span>
              <h1 className="mt-4 text-xl font-bold text-ink">Reset {student.full_name}&rsquo;s password?</h1>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                This generates a new temporary password and forces {student.full_name} to set a new one at next
                login. Their current password stops working immediately.
              </p>
              {error && (
                <div className="mt-3">
                  <Banner tone="danger">{error}</Banner>
                </div>
              )}
              <div className="mt-5 flex flex-col gap-2">
                <Button loading={isSubmitting} onClick={handleConfirm}>
                  Reset password
                </Button>
                <Button
                  variant="secondary"
                  disabled={isSubmitting}
                  onClick={() => navigate(`/school-admin/students/${studentId}`)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {result && (
            <ResultHero
              ok
              title="Password reset"
              message={`Share the new temporary password with ${result.full_name}. They’ll set their own at next sign-in.`}
            >
              <div className="mt-2 w-full rounded-control border border-line bg-canvas px-4 py-3 text-center">
                <div className="text-xs text-muted">New temporary password</div>
                <div className="mt-0.5 font-mono text-lg font-bold text-ink">{result.temp_password}</div>
              </div>
              <div className="mt-5 flex w-full flex-col gap-2">
                <Button leadingIcon="export" onClick={handleCopy}>
                  {copied ? 'Copied' : 'Copy password'}
                </Button>
                <Button variant="secondary" onClick={() => navigate(`/school-admin/students/${studentId}`)}>
                  Done
                </Button>
              </div>
            </ResultHero>
          )}
        </Card>
      </div>
    </AppShell>
  )
}
