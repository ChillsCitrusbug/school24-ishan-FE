import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Icon,
  Select,
  Spinner,
  type Column,
} from '@/components'
import { listStudents, type Student } from '@/features/students/api'
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
 * SC-028 · Students List — School Admin (FR-012). Shared across
 * FR-012/013/014 per the design's own screen inventory — this ticket
 * only wires Name/Student ID/Class/open; Balance (FR-030+) and Status
 * (FR-014, built later in this same batch) columns are added when
 * those tickets extend this same screen, not invented here.
 */
export function StudentsListScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[] | null>(null)
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [classFilter, setClassFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const load = useCallback(() => {
    setError(null)
    Promise.all([listStudents(), listClasses()])
      .then(([studentsResult, classesResult]) => {
        if (mountedRef.current) {
          setStudents(studentsResult)
          setClasses(classesResult)
        }
      })
      .catch((err: unknown) => {
        if (mountedRef.current) setError(extractErrorMessage(err, 'Something went wrong.'))
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const classLabelById = useMemo(
    () => new Map(classes.map((c) => [c.id, c.label])),
    [classes],
  )

  const filteredStudents = useMemo(() => {
    if (!students) return null
    if (!classFilter) return students
    return students.filter((s) => s.class_id === classFilter)
  }, [students, classFilter])

  const columns: Column<Student>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (s) => <span className="font-medium text-ink">{s.full_name}</span>,
    },
    {
      key: 'student_id',
      header: 'Student ID',
      cell: (s) => <span className="font-mono text-sm">{s.student_id}</span>,
    },
    {
      key: 'class',
      header: 'Class',
      cell: (s) => classLabelById.get(s.class_id) ?? '—',
    },
    {
      key: 'open',
      header: <span className="sr-only">Open</span>,
      align: 'right',
      cell: (s) => (
        <button
          type="button"
          aria-label={`Open ${s.full_name}`}
          onClick={() => navigate(`/school-admin/students/${s.id}`)}
          className="rounded p-1 hover:bg-canvas"
        >
          <Icon name="chevronRight" className="h-4 w-4 text-muted" strokeWidth={2} />
        </button>
      ),
    },
  ]

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
      topbar={
        <Topbar
          searchPlaceholder="Search students…"
          right={<IconButton icon="bell" label="Notifications" />}
        />
      }
      mobileNav={<MobileTabBar items={schoolAdminTabs('students')} />}
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">Students</h1>
            <p className="mt-0.5 text-sm text-muted">
              {filteredStudents ? `${filteredStudents.length} students shown.` : 'Loading…'}
            </p>
          </div>
          <Button leadingIcon="plus" onClick={() => navigate('/school-admin/students/new')}>
            Add student
          </Button>
        </div>

        {students && students.length > 0 && (
          <div className="mt-4 max-w-xs">
            <Select
              aria-label="Filter by class"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
        )}

        {students === null && !error ? (
          <div role="status" aria-label="Loading students" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : error ? (
          <Card className="mt-6">
            <ErrorState
              message={error}
              action={
                <Button variant="secondary" onClick={load}>
                  Try again
                </Button>
              }
            />
          </Card>
        ) : students && students.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon="children"
              title="No students yet"
              message="Enrol your first student to get started."
              action={
                <Button leadingIcon="plus" onClick={() => navigate('/school-admin/students/new')}>
                  Add student
                </Button>
              }
            />
          </Card>
        ) : (
          <Card className="mt-5">
            <DataTable columns={columns} rows={filteredStudents ?? []} rowKey={(s) => s.id} />
          </Card>
        )}
      </div>
    </AppShell>
  )
}
