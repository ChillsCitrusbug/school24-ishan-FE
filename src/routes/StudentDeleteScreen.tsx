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
import { getStudent, removeStudent, type Student } from '@/features/students/api'
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
 * SC-031 · Remove Student Confirmation — School Admin (FR-012 Scenario
 * 4). Unlike ClassDeleteScreen.tsx there is no "blocked" variant here —
 * Sc031RemoveStudent.tsx models only a single confirm state (removing a
 * student has no analogous "still has X" gate).
 */
export function StudentDeleteScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { studentId } = useParams<{ studentId: string }>()
  const [student, setStudent] = useState<Student | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

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

  async function handleRemove() {
    if (!studentId) return
    setError(null)
    setIsRemoving(true)
    try {
      await removeStudent(studentId)
      navigate('/school-admin/students', { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err, 'This student could not be removed.'))
      setIsRemoving(false)
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
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-danger-soft text-danger">
              <Icon name="close" className="h-8 w-8" strokeWidth={2} />
            </span>
            <h1 className="mt-4 text-xl font-bold text-ink">Remove {student.full_name}?</h1>

            {error && (
              <div className="mt-3">
                <Banner tone="danger">{error}</Banner>
              </div>
            )}

            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              This permanently removes the student and their record, and immediately blocks
              their sign-in. This can&rsquo;t be undone.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button variant="danger" loading={isRemoving} onClick={handleRemove}>
                Remove student
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/school-admin/students')}
                disabled={isRemoving}
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
