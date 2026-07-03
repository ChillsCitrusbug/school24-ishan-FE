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
  Avatar,
  Badge,
  StatusPill,
  EmptyState,
  ErrorState,
  Icon,
  Spinner,
  type Column,
} from '@/components'
import { listStaff, type StaffListItem, type StaffStatus } from '@/features/staff/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'

const STATUS_PILL: Record<StaffStatus, { tone: 'success' | 'warning' | 'neutral'; label: string }> = {
  active: { tone: 'success', label: 'Active' },
  pending: { tone: 'warning', label: 'Pending invite' },
  deactivated: { tone: 'neutral', label: 'Deactivated' },
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * SC-034 · Staff List / Staff Management — School Admin (FR-015/016).
 * Reuses the approved Sc034Staff.tsx structure/components as-is.
 */
export function StaffListScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [staff, setStaff] = useState<StaffListItem[] | null>(null)
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
    listStaff()
      .then((result) => {
        if (mountedRef.current) setStaff(result)
      })
      .catch((err: unknown) => {
        if (mountedRef.current) setError(extractErrorMessage(err, 'Something went wrong.'))
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const columns: Column<StaffListItem>[] = [
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
    { key: 'email', header: 'Email', cell: (s) => <span className="text-muted">{s.email}</span> },
    {
      key: 'role',
      header: 'Role',
      cell: (s) =>
        s.role_name ? <Badge tone="neutral">{s.role_name}</Badge> : <span className="text-muted">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (s) => {
        const pill = STATUS_PILL[s.status]
        return <StatusPill tone={pill.tone} label={pill.label} />
      },
    },
    {
      key: 'open',
      header: <span className="sr-only">Open</span>,
      align: 'right',
      cell: (s) => (
        <button
          type="button"
          aria-label={`Open ${s.full_name}`}
          onClick={() => navigate(`/school-admin/staff/${s.staff_profile_id}`)}
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
          groups={schoolAdminNavGroups('staff')}
          user={{
            initials: user ? initialsOf(user.full_name) : '',
            name: user?.full_name ?? '',
            role: 'School Admin',
          }}
        />
      }
      topbar={
        <Topbar
          searchPlaceholder="Search staff…"
          right={<IconButton icon="bell" label="Notifications" />}
        />
      }
      mobileNav={<MobileTabBar items={schoolAdminTabs('staff')} />}
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">Staff</h1>
            <p className="mt-0.5 text-sm text-muted">
              {staff ? `${staff.length} staff at ${user?.school_name ?? 'this school'}.` : 'Loading…'}
            </p>
          </div>
          <Button leadingIcon="plus" onClick={() => navigate('/school-admin/staff/new')}>
            Add staff
          </Button>
        </div>

        {staff === null && !error ? (
          <div role="status" aria-label="Loading staff" className="mt-10 flex justify-center text-muted">
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
        ) : staff && staff.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon="user"
              title="No staff yet"
              message="Invite canteen staff by email — they'll set their own password from the invite."
              action={
                <Button leadingIcon="plus" onClick={() => navigate('/school-admin/staff/new')}>
                  Add staff
                </Button>
              }
            />
          </Card>
        ) : (
          <Card className="mt-5">
            <DataTable columns={columns} rows={staff ?? []} rowKey={(s) => s.staff_profile_id} />
          </Card>
        )}
      </div>
    </AppShell>
  )
}
