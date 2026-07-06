import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, Sidebar, Topbar, MobileTabBar, IconButton, Card, EmptyState, ErrorState, Icon, Spinner } from '@/components'
import { getMyPermissions } from '@/features/permissions/api'
import type { ModulePermission } from '@/features/roles/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { STAFF_MODULES } from './roleModules'
import { staffNavGroups, staffTabs } from './staffNav'

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function hasAnyGrant(p: ModulePermission): boolean {
  return p.can_add || p.can_edit || p.can_delete || p.can_list
}

/**
 * SC-041 · Staff Portal — Role-Scoped Navigation / Module Access — Staff (FR-018).
 *
 * Reuses the approved Sc041StaffPortal.tsx structure/components as-is
 * (Step 16) — "renders exactly the modules the live permission set
 * grants, direct output of the role/permission engine"
 * (EXECUTION_ORDER.md). The design mock's own module list
 * (`staff.ts`) includes a "Reports" module that isn't a real
 * `PermissionModule` and omits "Approval" — the real 4-module set is
 * used here (see docs/design/field-reconciliation/FR-018.md item 7).
 * Module cards render per the approved design but are non-interactive —
 * their own destination screens (Orders/Menu/Notifications/Approvals)
 * don't exist yet, same "render per design, stay inert until the target
 * exists" precedent as FR-017's Edit/Delete buttons.
 */
export function StaffPortalScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [permissions, setPermissions] = useState<ModulePermission[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  // Bug: React StrictMode (dev-only) double-invokes this effect — the
  // first invocation's cleanup used to permanently flip mountedRef to
  // false, since it was never reset to true on (re-)mount. Any async
  // state update landing after that point was then silently dropped
  // forever, hanging the screen on its loading state. Resetting at the
  // top of the effect body (not just the cleanup) closes the gap.
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const load = useCallback(() => {
    setError(null)
    getMyPermissions()
      .then((result) => {
        if (mountedRef.current) setPermissions(result)
      })
      .catch((err: unknown) => {
        if (mountedRef.current) setError(extractErrorMessage(err, 'Something went wrong.'))
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const grantedByModule = new Map((permissions ?? []).map((p) => [p.module, p]))
  const visibleModules = STAFF_MODULES.filter((m) => {
    const grant = grantedByModule.get(m.module)
    return grant !== undefined && hasAnyGrant(grant)
  })

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          brandSubtitle={user?.school_name ?? undefined}
          groups={staffNavGroups()}
          user={{
            initials: user ? initialsOf(user.full_name) : '',
            name: user?.full_name ?? '',
            role: 'Staff',
          }}
        />
      }
      topbar={
        <Topbar
          searchPlaceholder="Search…"
          right={<IconButton icon="bell" label="Notifications" onClick={() => navigate('/staff/inbox')} />}
        />
      }
      mobileNav={<MobileTabBar items={staffTabs()} />}
    >
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-ink">
          Welcome{user ? `, ${user.full_name.split(' ')[0]}` : ''} 👋
        </h1>
        <p className="mt-0.5 text-sm text-muted">{user?.school_name ?? 'Your school'}</p>

        {permissions === null && !error ? (
          <div role="status" aria-label="Loading your modules" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : error ? (
          <Card className="mt-6">
            <ErrorState
              message={error}
              action={
                <button type="button" onClick={load} className="text-sm font-semibold text-brand-deep">
                  Try again
                </button>
              }
            />
          </Card>
        ) : visibleModules.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon="lock"
              title="No modules assigned yet"
              message="Your account is active, but no permissions have been granted. Ask your school admin to assign you a role."
            />
          </Card>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {visibleModules.map((m) => {
              // FR-038 — "Order fulfilment" now has a real destination
              // screen; the other 3 modules' own destination screens
              // don't exist yet, so they stay inert (same precedent as
              // FR-017's own Edit/Delete buttons).
              const isClickable = m.module === 'order_management'
              const content = (
                <>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-card bg-brand/10 text-brand">
                    <Icon name={m.icon} />
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">{m.label}</div>
                    <p className="mt-0.5 text-sm text-muted">{m.desc}</p>
                  </div>
                </>
              )
              return isClickable ? (
                <button
                  key={m.module}
                  type="button"
                  onClick={() => navigate('/school-admin/orders')}
                  className="flex items-start gap-3 rounded-card border border-line bg-white p-5 text-left shadow-softer transition hover:bg-canvas"
                >
                  {content}
                </button>
              ) : (
                <div
                  key={m.module}
                  className="flex items-start gap-3 rounded-card border border-line bg-white p-5 text-left shadow-softer"
                >
                  {content}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
