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
import { deleteClass, getClass, type SchoolClass } from '@/features/classes/api'
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
 * SC-026 · Delete Class Confirmation — School Admin (FR-011 Scenario 3).
 * Fetches the real class first (for its label and live `student_count`)
 * to decide between the design's `default`/`blocked` states, rather
 * than guessing — same approach as RoleDeleteScreen.tsx (FR-018).
 *
 * Field-reconciliation decision #5: the blocked state's own "Move
 * students" button has no bulk-move feature to link to (none exists in
 * this codebase) — it routes to this class's own enrolled-students view
 * instead, the real workaround available today.
 */
export function ClassDeleteScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { classId } = useParams<{ classId: string }>()
  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!classId) return
    let cancelled = false
    getClass(classId)
      .then((result) => {
        if (!cancelled) setSchoolClass(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(extractErrorMessage(err, 'This class could not be found.'))
      })
    return () => {
      cancelled = true
    }
  }, [classId])

  async function handleDelete() {
    if (!classId) return
    setError(null)
    setIsDeleting(true)
    try {
      await deleteClass(classId)
      navigate('/school-admin/classes', { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err, 'This class could not be deleted.'))
      setIsDeleting(false)
    }
  }

  const blocked = Boolean(schoolClass && schoolClass.student_count > 0)

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          brandSubtitle={user?.school_name ?? undefined}
          groups={schoolAdminNavGroups('classes')}
          user={{
            initials: user ? initialsOf(user.full_name) : '',
            name: user?.full_name ?? '',
            role: 'School Admin',
          }}
        />
      }
      topbar={<Topbar right={<IconButton icon="bell" label="Notifications" />} />}
      mobileNav={<MobileTabBar items={schoolAdminTabs('classes')} />}
    >
      <div className="mx-auto max-w-md pt-6">
        {!schoolClass && !loadError && (
          <div role="status" aria-label="Loading class" className="flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {loadError && (
          <Card className="p-8">
            <Banner tone="danger">{loadError}</Banner>
          </Card>
        )}

        {schoolClass && (
          <Card className="p-8 text-center">
            <span
              className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${
                blocked ? 'bg-warning-soft text-warning' : 'bg-danger-soft text-danger'
              }`}
            >
              <Icon name={blocked ? 'alert' : 'close'} className="h-8 w-8" strokeWidth={2} />
            </span>
            <h1 className="mt-4 text-xl font-bold text-ink">
              {blocked ? "Can't delete this class" : `Delete ${schoolClass.label}?`}
            </h1>

            {error && (
              <div className="mt-3">
                <Banner tone="danger">{error}</Banner>
              </div>
            )}

            {blocked ? (
              <>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                  {schoolClass.label} has {schoolClass.student_count} student
                  {schoolClass.student_count === 1 ? '' : 's'} enrolled. Move them to another
                  class first, then delete it.
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <Button onClick={() => navigate(`/school-admin/classes/${schoolClass.id}`)}>
                    Move students
                  </Button>
                  <Button variant="secondary" onClick={() => navigate('/school-admin/classes')}>
                    Back to classes
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                  This permanently removes the class. Students aren&rsquo;t deleted, but
                  they&rsquo;ll no longer belong to a class.
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <Button variant="danger" loading={isDeleting} onClick={handleDelete}>
                    Delete class
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/school-admin/classes')}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}
      </div>
    </AppShell>
  )
}
