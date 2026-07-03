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
  DataTable,
  EmptyState,
  Spinner,
  type Column,
} from '@/components'
import {
  getClass,
  listStudentsInClass,
  type EnrolledStudent,
  type SchoolClass,
} from '@/features/classes/api'
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
 * Class detail — School Admin (FR-011 Scenario 4, "opens a class to
 * view enrolled students"). No approved design mock exists for this
 * screen (the ticket cites only Sc024/025/026) — per
 * docs/design/field-reconciliation/FR-011.md decision #8, this is
 * composed entirely from already-approved shared primitives every other
 * list screen already uses (Card, DataTable, EmptyState), no new visual
 * design invented. Always empty in practice today (FR-012, enrolment,
 * hasn't shipped yet) — the endpoint and screen are real regardless, per
 * the ticket's own explicit Scenario 4 acceptance criterion.
 */
export function ClassDetailScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { classId } = useParams<{ classId: string }>()
  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null)
  const [students, setStudents] = useState<EnrolledStudent[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!classId) return
    let cancelled = false
    Promise.all([getClass(classId), listStudentsInClass(classId)])
      .then(([classResult, studentsResult]) => {
        if (!cancelled) {
          setSchoolClass(classResult)
          setStudents(studentsResult)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(extractErrorMessage(err, 'This class could not be found.'))
      })
    return () => {
      cancelled = true
    }
  }, [classId])

  const columns: Column<EnrolledStudent>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (s) => <span className="font-medium text-ink">{s.full_name}</span>,
    },
    { key: 'student_id', header: 'Student ID', cell: (s) => s.student_id },
  ]

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
      <div className="mx-auto max-w-3xl">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate('/school-admin/classes')}
        >
          Classes
        </Button>

        {error && <Banner tone="danger">{error}</Banner>}

        {!schoolClass && !error && (
          <div role="status" aria-label="Loading class" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {schoolClass && (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-ink">{schoolClass.label}</h1>
                <p className="mt-0.5 text-sm text-muted">
                  {schoolClass.student_count} student{schoolClass.student_count === 1 ? '' : 's'}{' '}
                  enrolled
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/school-admin/classes/${schoolClass.id}/edit`)}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => navigate(`/school-admin/classes/${schoolClass.id}/delete`)}
                >
                  Delete
                </Button>
              </div>
            </div>

            {students && students.length === 0 ? (
              <Card className="mt-5">
                <EmptyState
                  icon="children"
                  title="No students enrolled"
                  message="Students enrolled into this class will appear here."
                />
              </Card>
            ) : (
              <Card className="mt-5">
                <DataTable columns={columns} rows={students ?? []} rowKey={(s) => s.id} />
              </Card>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
