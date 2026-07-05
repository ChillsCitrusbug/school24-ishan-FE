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
  Avatar,
  Banner,
  InfoRow,
  StatusPill,
  Spinner,
} from '@/components'
import { getStudent, type Student } from '@/features/students/api'
import { listClasses, type SchoolClass } from '@/features/classes/api'
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
 * SC-096 · Student Detail (read-only record / action hub) — School
 * Admin (FR-012). Reuses the approved Sc096StudentDetail.tsx structure.
 *
 * Field-reconciliation decision #10 (FR-012): this ticket only wired
 * "Edit details" and "Remove student" — "Reset credential" (FR-051,
 * not in this batch) and "Manage guardians" (FR-019/021, not in this
 * batch) remain omitted; "Deactivate/Reactivate" is now wired for
 * real, FR-014's own addition, once its own routed confirm screen
 * (StudentStatusScreen.tsx) existed to navigate to.
 *
 * Round 1 review finding (Major, FR-014): FR-014 deliberately widened
 * this screen's own read access to inactive students (previously a
 * 404), but PUT/DELETE deliberately did NOT — so "Edit details"/
 * "Remove student" are now hidden for an inactive student, avoiding a
 * dead-end form that would 404 on submit. Only "Reactivate" remains
 * for an inactive student.
 */
export function StudentDetailScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { studentId } = useParams<{ studentId: string }>()
  const [student, setStudent] = useState<Student | null>(null)
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId) return
    let cancelled = false
    Promise.all([getStudent(studentId), listClasses()])
      .then(([studentResult, classesResult]) => {
        if (!cancelled) {
          setStudent(studentResult)
          setClasses(classesResult)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(extractErrorMessage(err, 'This student could not be found.'))
      })
    return () => {
      cancelled = true
    }
  }, [studentId])

  const classLabel = classes.find((c) => c.id === student?.class_id)?.label ?? '—'

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
      <div className="mx-auto max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate('/school-admin/students')}
        >
          Students
        </Button>

        {error && <Banner tone="danger">{error}</Banner>}

        {!student && !error && (
          <div role="status" aria-label="Loading student" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {student && (
          <>
            <div className="flex items-center gap-4">
              <Avatar
                initials={initialsOf(student.full_name)}
                tone={student.is_active ? 'brand' : 'neutral'}
                size="lg"
              />
              <div>
                <h1 className="text-2xl font-bold text-ink">{student.full_name}</h1>
                <p className="mt-0.5 text-sm text-muted">
                  {student.student_id} · {classLabel}
                </p>
              </div>
              <StatusPill
                tone={student.is_active ? 'success' : 'neutral'}
                label={student.is_active ? 'Active' : 'Inactive'}
                className="ml-auto"
              />
            </div>

            <Card className="mt-4">
              <div className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">
                Record
              </div>
              <div className="divide-y divide-line">
                <InfoRow label="Student ID" value={student.student_id} />
                <InfoRow label="Class" value={classLabel} />
                <InfoRow label="Status" value={student.is_active ? 'Active' : 'Inactive'} />
              </div>
            </Card>

            <Card className="mt-4 p-4">
              <div className="mb-3 text-sm font-semibold text-ink">Actions</div>
              <div className="flex flex-wrap gap-2">
                {student.is_active && (
                  <Button
                    variant="secondary"
                    size="sm"
                    leadingIcon="user"
                    onClick={() => navigate(`/school-admin/students/${student.id}/edit`)}
                  >
                    Edit details
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/school-admin/students/${student.id}/status`)}
                >
                  {student.is_active ? 'Deactivate' : 'Reactivate'}
                </Button>
                {student.is_active && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => navigate(`/school-admin/students/${student.id}/delete`)}
                  >
                    Remove student
                  </Button>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
