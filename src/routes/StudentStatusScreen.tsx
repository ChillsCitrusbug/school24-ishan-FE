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
  Spinner,
} from '@/components'
import { getStudent, setStudentStatus, type Student } from '@/features/students/api'
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
 * SC-032 · Student Activate/Deactivate Confirmation — School Admin
 * (FR-014). Reuses the approved Sc032StudentStatus.tsx structure — a
 * separate routed confirmation screen (matching FR-016's own
 * StaffStatusScreen.tsx precedent), NOT an inline dialog on the detail
 * screen. Both deactivate AND reactivate go through this same confirm
 * step, matching the mock's own two states exactly. This is additive
 * to (not a replacement of) FR-012's own already-shipped "Remove
 * student" flow — field-reconciliation decision #3.
 */
export function StudentStatusScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { studentId } = useParams<{ studentId: string }>()
  const [student, setStudent] = useState<Student | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!studentId) return
    let cancelled = false
    getStudent(studentId)
      .then((result) => {
        if (!cancelled) setStudent(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(extractErrorMessage(err, 'This student could not be found.'))
      })
    return () => {
      cancelled = true
    }
  }, [studentId])

  const isDeactivating = student?.is_active !== false

  async function handleConfirm() {
    if (!studentId || !student) return
    setError(null)
    setIsSubmitting(true)
    try {
      await setStudentStatus(studentId, !isDeactivating)
      navigate(`/school-admin/students/${studentId}`, { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err, 'This student’s status could not be changed.'))
      setIsSubmitting(false)
    }
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
        {!student && !loadError && (
          <div role="status" aria-label="Loading student" className="flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {loadError && (
          <Card className="p-8">
            <Banner tone="danger">{loadError}</Banner>
          </Card>
        )}

        {student && (
          <Card className="p-8 text-center">
            <span
              className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${
                isDeactivating ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'
              }`}
            >
              <Icon name={isDeactivating ? 'lock' : 'check'} className="h-8 w-8" strokeWidth={2} />
            </span>
            <h1 className="mt-4 text-xl font-bold text-ink">
              {isDeactivating ? `Deactivate ${student.full_name}?` : `Reactivate ${student.full_name}?`}
            </h1>

            {error && (
              <div className="mt-3">
                <Banner tone="danger">{error}</Banner>
              </div>
            )}

            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              {isDeactivating
                ? `${student.full_name} won’t be able to sign in or order until reactivated. Their guardians will be notified by email.`
                : `${student.full_name} will be able to sign in and order again. Their guardians will be notified by email.`}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button
                variant={isDeactivating ? 'danger' : 'primary'}
                loading={isSubmitting}
                onClick={handleConfirm}
              >
                {isDeactivating ? 'Deactivate & email' : 'Reactivate & email'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(`/school-admin/students/${student.id}`)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
