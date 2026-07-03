import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  Card,
  SegmentedControl,
  DataTable,
  Avatar,
  Badge,
  StatusPill,
  EmptyState,
  ErrorState,
  Icon,
  Spinner,
  Button,
  type Column,
} from '@/components'
import { listUsers, type PlatformUser } from '@/features/users/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { platformAdminNavGroups, platformAdminTabs } from './platformAdminNav'

const ROLE_LABEL: Record<PlatformUser['role'], string> = {
  school_admin: 'School Admin',
  staff: 'Staff',
  parent: 'Parent',
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * SC-020 · Cross-School Users List — Platform Admin (FR-009).
 * Field-reconciliation decision #1: the backend genuinely supports
 * pagination/search/sort as real query params, but this screen renders
 * exactly what the approved mock shows — a role filter and a plain
 * table, nothing invented (the mock's own topbar search box is the same
 * decorative-only affordance every other screen in this app already
 * uses; no other screen wires it to a real query either).
 */
export function UsersListScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<'all' | PlatformUser['role']>('all')
  const [users, setUsers] = useState<PlatformUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const load = useCallback((roleFilter: 'all' | PlatformUser['role']) => {
    setError(null)
    listUsers(roleFilter === 'all' ? {} : { role: roleFilter })
      .then((result) => {
        if (mountedRef.current) setUsers(result.items)
      })
      .catch((err: unknown) => {
        if (mountedRef.current) setError(extractErrorMessage(err, 'Something went wrong.'))
      })
  }, [])

  useEffect(() => {
    setUsers(null)
    load(role)
  }, [load, role])

  const columns: Column<PlatformUser>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (u) => (
        <span className="inline-flex items-center gap-2">
          <Avatar initials={initialsOf(u.full_name)} tone="brand" size="sm" />
          <span className="font-medium text-ink">{u.full_name}</span>
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (u) => <Badge tone="neutral">{ROLE_LABEL[u.role]}</Badge>,
    },
    {
      key: 'school',
      header: 'School',
      cell: (u) => <span className="text-muted">{u.school_name ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (u) => (
        <StatusPill
          tone={u.is_active ? 'success' : 'neutral'}
          label={u.is_active ? 'Active' : 'Deactivated'}
        />
      ),
    },
    {
      key: 'open',
      header: <span className="sr-only">Open</span>,
      align: 'right',
      cell: (u) => (
        <button
          type="button"
          aria-label={`Open ${u.full_name}`}
          onClick={() => navigate(`/platform-admin/users/${u.id}`)}
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
          brandSubtitle="Platform"
          groups={platformAdminNavGroups('users')}
          user={{
            initials: user ? initialsOf(user.full_name) : '',
            name: user?.full_name ?? '',
            role: 'Platform Admin',
          }}
        />
      }
      topbar={
        <Topbar
          searchPlaceholder="Search users…"
          right={<IconButton icon="bell" label="Notifications" />}
        />
      }
      mobileNav={<MobileTabBar items={platformAdminTabs('users')} />}
    >
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-ink">Users</h1>
        <p className="mt-0.5 text-sm text-muted">Everyone across all schools on the platform.</p>

        <div className="mt-5 overflow-x-auto pb-1">
          <SegmentedControl
            ariaLabel="Filter by role"
            value={role}
            onChange={(v) => setRole(v as 'all' | PlatformUser['role'])}
            segments={[
              { value: 'all', label: 'All' },
              { value: 'school_admin', label: 'Admins' },
              { value: 'staff', label: 'Staff' },
              { value: 'parent', label: 'Parents' },
            ]}
          />
        </div>

        {users === null && !error ? (
          <div role="status" aria-label="Loading users" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : error ? (
          <Card className="mt-6">
            <ErrorState
              message={error}
              action={
                <Button variant="secondary" onClick={() => load(role)}>
                  Try again
                </Button>
              }
            />
          </Card>
        ) : users && users.length === 0 ? (
          <Card className="mt-6">
            <EmptyState icon="children" title="No users found" message="No users match this filter." />
          </Card>
        ) : (
          <Card className="mt-4">
            <DataTable columns={columns} rows={users ?? []} rowKey={(u) => u.id} />
          </Card>
        )}
      </div>
    </AppShell>
  )
}
