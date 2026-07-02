import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, Sidebar, Topbar, MobileTabBar, IconButton, Button, Card, Badge, EmptyState, ErrorState, Icon, Spinner } from '@/components'
import { listRoles, type Role } from '@/features/roles/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'
import { summarizePermissions } from './roleModules'

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * SC-037 · Roles & Permissions List — SA (FR-017, edit/delete wired by FR-018).
 *
 * Reuses the approved Sc037Roles.tsx structure/components as-is (Step
 * 16). "Create role", "Edit", and "Delete" are all wired to their real
 * flows.
 *
 * Review finding, FR-017 (Major): the initial fetch had no `.catch` and
 * no error state — any non-401 failure left the screen silently
 * indistinguishable from "you have zero roles" (a misleading empty
 * state, not an honest error). Fixed with an explicit `error` state and
 * a retry action (`ErrorState`), matching agents/frontend.md's own
 * loading/error/empty/success rule and the sibling precedent already
 * established in ActivateAccountScreen.tsx.
 */
export function RolesListScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [roles, setRoles] = useState<Role[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(
    () => () => {
      mountedRef.current = false
    },
    [],
  )

  const load = useCallback(() => {
    setError(null)
    listRoles()
      .then((result) => {
        if (mountedRef.current) setRoles(result)
      })
      .catch((err: unknown) => {
        if (mountedRef.current) setError(extractErrorMessage(err, 'Something went wrong.'))
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          brandSubtitle={user?.school_name ?? undefined}
          groups={schoolAdminNavGroups()}
          user={{
            initials: user ? initialsOf(user.full_name) : '',
            name: user?.full_name ?? '',
            role: 'School Admin',
          }}
        />
      }
      topbar={
        <Topbar
          searchPlaceholder="Search roles…"
          right={<IconButton icon="bell" label="Notifications" />}
        />
      }
      mobileNav={<MobileTabBar items={schoolAdminTabs()} />}
    >
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">Roles &amp; permissions</h1>
            <p className="mt-0.5 text-sm text-muted">Control what each staff member can do.</p>
          </div>
          <Button leadingIcon="plus" onClick={() => navigate('/school-admin/roles/new')}>
            Create role
          </Button>
        </div>

        {roles === null && !error ? (
          <div role="status" aria-label="Loading roles" className="mt-10 flex justify-center text-muted">
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
        ) : roles && roles.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon="shield"
              title="No roles yet"
              message="Create a role and choose which modules and actions it can access."
              action={
                <Button leadingIcon="plus" onClick={() => navigate('/school-admin/roles/new')}>
                  Create role
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="mt-5 space-y-3">
            {(roles ?? []).map((r) => (
              <Card key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-card bg-brand/10 text-brand">
                  <Icon name="shield" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{r.name}</span>
                    <Badge tone="neutral">{r.staff_count} staff</Badge>
                  </div>
                  <div className="text-xs text-muted">{summarizePermissions(r.permissions)}</div>
                </div>
                <div className="ml-auto flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/school-admin/roles/${r.id}/edit`)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/school-admin/roles/${r.id}/delete`)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
