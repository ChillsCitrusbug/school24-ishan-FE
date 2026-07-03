import { useCallback, useEffect, useRef, useState } from 'react'
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
  Spinner,
  type Column,
} from '@/components'
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
 * SC-024 · Classes List / Class Management — School Admin (FR-011).
 * Field-reconciliation decision #1: the mock's own "Year"/"Teacher"
 * columns have no backing DB columns (`classes` has only `label`) —
 * dropped, not invented; this table shows Class/Students/open only.
 */
export function ClassesListScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [classes, setClasses] = useState<SchoolClass[] | null>(null)
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
    listClasses()
      .then((result) => {
        if (mountedRef.current) setClasses(result)
      })
      .catch((err: unknown) => {
        if (mountedRef.current) setError(extractErrorMessage(err, 'Something went wrong.'))
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const columns: Column<SchoolClass>[] = [
    {
      key: 'label',
      header: 'Class',
      cell: (c) => <span className="font-medium text-ink">{c.label}</span>,
    },
    { key: 'students', header: 'Students', align: 'right', cell: (c) => String(c.student_count) },
    {
      key: 'open',
      header: <span className="sr-only">Open</span>,
      align: 'right',
      cell: (c) => (
        <button
          type="button"
          aria-label={`Open ${c.label}`}
          onClick={() => navigate(`/school-admin/classes/${c.id}`)}
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
          groups={schoolAdminNavGroups('classes')}
          user={{
            initials: user ? initialsOf(user.full_name) : '',
            name: user?.full_name ?? '',
            role: 'School Admin',
          }}
        />
      }
      topbar={
        <Topbar
          searchPlaceholder="Search classes…"
          right={<IconButton icon="bell" label="Notifications" />}
        />
      }
      mobileNav={<MobileTabBar items={schoolAdminTabs('classes')} />}
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">Classes</h1>
            <p className="mt-0.5 text-sm text-muted">
              {classes ? `Showing ${classes.length} of ${classes.length} classes.` : 'Loading…'}
            </p>
          </div>
          <Button leadingIcon="plus" onClick={() => navigate('/school-admin/classes/new')}>
            Create class
          </Button>
        </div>

        {classes === null && !error ? (
          <div role="status" aria-label="Loading classes" className="mt-10 flex justify-center text-muted">
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
        ) : classes && classes.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon="grid"
              title="No classes yet"
              message="Create your first class, then enrol students into it."
              action={
                <Button leadingIcon="plus" onClick={() => navigate('/school-admin/classes/new')}>
                  Create class
                </Button>
              }
            />
          </Card>
        ) : (
          <Card className="mt-5">
            <DataTable columns={columns} rows={classes ?? []} rowKey={(c) => c.id} />
          </Card>
        )}
      </div>
    </AppShell>
  )
}
