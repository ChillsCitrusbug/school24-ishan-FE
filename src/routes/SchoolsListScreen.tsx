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
  StatusPill,
  EmptyState,
  ErrorState,
  Icon,
  Spinner,
  type Column,
} from '@/components'
import { listSchools, type School } from '@/features/schools/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { platformAdminNavGroups, platformAdminTabs } from './platformAdminNav'

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function formatOnboarded(createdAt: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(
    new Date(createdAt),
  )
}

/**
 * SC-017 · Schools List (cross-school) — Platform Admin (FR-006-008; this
 * ticket only wires "Onboard school" — row-level open/edit is FR-007's
 * scope, so rows stay non-interactive for now, same "render per design,
 * stay inert until the target exists" precedent as FR-001/017's own
 * unwired affordances).
 *
 * Review-learned pattern applied from the start (FR-017's own review
 * finding): an explicit loading/error state, not a silent
 * indistinguishable-from-empty failure.
 */
export function SchoolsListScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [schools, setSchools] = useState<School[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  // React StrictMode (dev-only) double-invokes this effect — resetting
  // mountedRef to true at the top (not just clearing it in the cleanup)
  // avoids the first invocation's cleanup permanently zeroing it before
  // the real mount's async work resolves. See RolesListScreen.tsx's own
  // fix for this same pattern (same root cause, found while visual-
  // checking this screen).
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const load = useCallback(() => {
    setError(null)
    listSchools()
      .then((result) => {
        if (mountedRef.current) setSchools(result)
      })
      .catch((err: unknown) => {
        if (mountedRef.current) setError(extractErrorMessage(err, 'Something went wrong.'))
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const columns: Column<School>[] = [
    {
      key: 'name',
      header: 'School',
      cell: (s) => <span className="font-medium text-ink">{s.school_name}</span>,
    },
    {
      key: 'admin',
      header: 'Admin',
      cell: (s) => <span className="text-muted">{s.primary_contact_name}</span>,
    },
    { key: 'students', header: 'Students', align: 'right', cell: (s) => String(s.student_count) },
    {
      key: 'status',
      header: 'Status',
      cell: (s) => (
        <StatusPill
          tone={s.is_active ? 'success' : 'danger'}
          label={s.is_active ? 'Active' : 'Inactive'}
        />
      ),
    },
    {
      key: 'onboarded',
      header: 'Onboarded',
      cell: (s) => <span className="text-muted">{formatOnboarded(s.created_at)}</span>,
    },
    {
      key: 'open',
      header: <span className="sr-only">Open</span>,
      align: 'right',
      cell: () => <Icon name="chevronRight" className="h-4 w-4 text-muted" strokeWidth={2} />,
    },
  ]

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          brandSubtitle="Platform"
          groups={platformAdminNavGroups()}
          user={{
            initials: user ? initialsOf(user.full_name) : '',
            name: user?.full_name ?? '',
            role: 'Platform Admin',
          }}
        />
      }
      topbar={
        <Topbar
          searchPlaceholder="Search schools…"
          right={<IconButton icon="bell" label="Notifications" />}
        />
      }
      mobileNav={<MobileTabBar items={platformAdminTabs()} />}
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">Schools</h1>
            <p className="mt-0.5 text-sm text-muted">
              {schools ? `Showing ${schools.length} of ${schools.length} schools.` : 'Loading…'}
            </p>
          </div>
          <Button leadingIcon="plus" onClick={() => navigate('/platform-admin/schools/new')}>
            Onboard school
          </Button>
        </div>

        {schools === null && !error ? (
          <div role="status" aria-label="Loading schools" className="mt-10 flex justify-center text-muted">
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
        ) : schools && schools.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon="list"
              title="No schools yet"
              message="Onboard your first school to get started."
              action={
                <Button leadingIcon="plus" onClick={() => navigate('/platform-admin/schools/new')}>
                  Onboard school
                </Button>
              }
            />
          </Card>
        ) : (
          <Card className="mt-5">
            <DataTable columns={columns} rows={schools ?? []} rowKey={(s) => s.id} />
          </Card>
        )}
      </div>
    </AppShell>
  )
}
