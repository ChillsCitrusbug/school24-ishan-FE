import { useCallback, useEffect, useState } from 'react'
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
  Avatar,
  Select,
  Input,
  StatusPill,
  Spinner,
  type Column,
} from '@/components'
import {
  listStudents,
  type Student,
  type ListStudentsParams,
} from '@/features/students/api'
import { listClasses, type SchoolClass } from '@/features/classes/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'

const PAGE_SIZE = 20
const DEBOUNCE_MS = 300

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * SC-028 · Students List — School Admin (FR-012/013/014). Reuses the
 * approved Sc028Students.tsx structure — Name (with Avatar)/Student
 * ID/Class/Status/open columns, a Class filter dropdown.
 *
 * Field-reconciliation decision #6 (FR-014): Student ID and Student
 * Name filter inputs are added on the page body — the mock's own
 * Topbar search field is purely decorative everywhere in this
 * codebase (no `onSearch` prop exists on the shared `Topbar`
 * component), so it was never a real option for wiring these 2
 * required filters. Sort controls (2 selects) are likewise not in the
 * mock but required by this ticket's own DoD ("sortable").
 *
 * A "Credentials" cross-link button (not in the approved mock, which
 * has no navigation between Sc028/Sc033) was added once FR-013
 * shipped — without it there would be no in-app way to reach the new
 * credentials screen.
 */
export function StudentsListScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[] | null>(null)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [classFilter, setClassFilter] = useState('')
  const [studentIdInput, setStudentIdInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [studentIdFilter, setStudentIdFilter] = useState('')
  const [nameFilter, setNameFilter] = useState('')
  const [sortBy, setSortBy] = useState<ListStudentsParams['sort_by']>('full_name')
  const [sortDir, setSortDir] = useState<ListStudentsParams['sort_dir']>('asc')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listClasses().then(setClasses).catch(() => undefined)
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setStudentIdFilter(studentIdInput)
      setPage(1)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [studentIdInput])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setNameFilter(nameInput)
      setPage(1)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [nameInput])

  const load = useCallback(() => {
    setError(null)
    listStudents({
      class_id: classFilter || undefined,
      student_id: studentIdFilter || undefined,
      name: nameFilter || undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
      page,
      page_size: PAGE_SIZE,
    })
      .then(({ data, meta }) => {
        setStudents(data)
        setTotal(meta.total)
        setTotalPages(meta.total_pages)
      })
      .catch((err: unknown) => {
        setError(extractErrorMessage(err, 'Something went wrong.'))
      })
  }, [classFilter, studentIdFilter, nameFilter, sortBy, sortDir, page])

  useEffect(() => {
    load()
  }, [load])

  const classLabelById = new Map(classes.map((c) => [c.id, c.label]))

  const columns: Column<Student>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (s) => (
        <span className="inline-flex items-center gap-2">
          <Avatar initials={initialsOf(s.full_name)} tone="brand" size="sm" />
          <span className="font-medium text-ink">{s.full_name}</span>
        </span>
      ),
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
      key: 'status',
      header: 'Status',
      cell: (s) => (
        <StatusPill
          tone={s.is_active ? 'success' : 'neutral'}
          label={s.is_active ? 'Active' : 'Inactive'}
        />
      ),
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

  const hasAnyFilter = Boolean(classFilter || studentIdInput || nameInput)

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
              {students ? `${students.length} of ${total} students shown.` : 'Loading…'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate('/school-admin/students/credentials')}
            >
              Credentials
            </Button>
            <Button leadingIcon="plus" onClick={() => navigate('/school-admin/students/new')}>
              Add student
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="w-56">
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="class-filter">
              Class
            </label>
            <Select
              id="class-filter"
              aria-label="Filter by class"
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-48">
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="student-id-filter">
              Student ID
            </label>
            <Input
              id="student-id-filter"
              placeholder="e.g. S-12345"
              value={studentIdInput}
              onChange={(e) => setStudentIdInput(e.target.value)}
            />
          </div>
          <div className="w-56">
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="name-filter">
              Student Name
            </label>
            <Input
              id="name-filter"
              placeholder="e.g. Ada"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
          </div>
          <div className="w-44">
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="sort-by">
              Sort by
            </label>
            <Select
              id="sort-by"
              aria-label="Sort by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ListStudentsParams['sort_by'])}
            >
              <option value="full_name">Name</option>
              <option value="student_id">Student ID</option>
              <option value="class">Class</option>
            </Select>
          </div>
          <div className="w-36">
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="sort-dir">
              Order
            </label>
            <Select
              id="sort-dir"
              aria-label="Sort direction"
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as ListStudentsParams['sort_dir'])}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </Select>
          </div>
        </div>

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
              title={hasAnyFilter ? 'No students match these filters' : 'No students yet'}
              message={
                hasAnyFilter
                  ? 'Try adjusting the filters above.'
                  : 'Enrol your first student to get started.'
              }
              action={
                hasAnyFilter ? undefined : (
                  <Button leadingIcon="plus" onClick={() => navigate('/school-admin/students/new')}>
                    Add student
                  </Button>
                )
              }
            />
          </Card>
        ) : (
          <>
            <Card className="mt-5">
              <DataTable columns={columns} rows={students ?? []} rowKey={(s) => s.id} />
            </Card>
            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between text-sm text-muted">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
