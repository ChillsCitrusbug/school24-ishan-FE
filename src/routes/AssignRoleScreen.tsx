import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell, Sidebar, Topbar, MobileTabBar, IconButton, Button, Card, Banner } from '@/components'
import { cn } from '@/lib/cn'
import { listRoles, type Role } from '@/features/roles/api'
import { assignRole, getStaffSummary } from '@/features/staff/api'
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
 * SC-040 · Assign Role to Staff — SA (FR-018).
 *
 * Reuses the approved Sc040AssignRole.tsx structure/components as-is
 * (Step 16). The design shows no staff-picker — it's navigated to with
 * the target staff already known (a hardcoded name in the mock's own
 * back-button/subtitle) — so this screen takes the target's `staffId`
 * (a `staff_profile_id`) via a route param and fetches just their name
 * for the approved "Choose the role for <name>" copy, not a staff-list
 * fetch of its own. No in-app link reaches this route yet (no staff
 * list screen exists — that's FR-015) — reachable by URL, same
 * precedent as FR-017's own Roles screens before FR-018 shipped.
 */
export function AssignRoleScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { staffId } = useParams<{ staffId: string }>()
  const [staffName, setStaffName] = useState<string | null>(null)
  const [roles, setRoles] = useState<Role[] | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!staffId) return
    let cancelled = false
    Promise.all([getStaffSummary(staffId), listRoles()])
      .then(([staff, roleList]) => {
        if (cancelled) return
        setStaffName(staff.full_name)
        setSelectedRoleId(staff.assigned_role_id)
        setRoles(roleList)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(extractErrorMessage(err, 'This staff member could not be found.'))
      })
    return () => {
      cancelled = true
    }
  }, [staffId])

  async function handleAssign() {
    if (!staffId) return
    setError(null)
    setIsSubmitting(true)
    try {
      await assignRole(staffId, selectedRoleId)
      navigate('/school-admin/roles', { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err, 'This role could not be assigned.'))
      setIsSubmitting(false)
    }
  }

  const isLoading = roles === null && !error

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
          searchPlaceholder="Search…"
          right={<IconButton icon="bell" label="Notifications" />}
        />
      }
      mobileNav={<MobileTabBar items={schoolAdminTabs()} />}
    >
      <div className="mx-auto max-w-lg">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate('/school-admin/roles')}
        >
          {staffName ?? 'Back'}
        </Button>
        <h1 className="text-2xl font-bold text-ink">Assign a role</h1>
        <p className="mt-0.5 text-sm text-muted">
          Choose the role for {staffName ?? 'this staff member'}. It applies immediately.
        </p>

        {error && (
          <div className="mt-4">
            <Banner tone="danger">{error}</Banner>
          </div>
        )}

        {isLoading ? (
          <div role="status" aria-label="Loading roles" className="mt-10 text-center text-sm text-muted">
            Loading…
          </div>
        ) : roles && roles.length === 0 ? (
          <Card className="mt-5 p-8 text-center text-sm text-muted">
            No roles exist yet. Create a role first, then assign it.
          </Card>
        ) : (
          <>
            <div role="radiogroup" aria-label="Choose a role" className="mt-5 space-y-2">
              {(roles ?? []).map((r) => {
                const selected = r.id === selectedRoleId
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSelectedRoleId(r.id)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-card border px-4 py-3 text-left transition',
                      selected
                        ? 'border-brand bg-brand/5 ring-1 ring-brand/30'
                        : 'border-line hover:bg-canvas',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2',
                        selected ? 'border-brand' : 'border-line',
                      )}
                    >
                      {selected && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
                    </span>
                    <div>
                      <div className="font-medium text-ink">{r.name}</div>
                      <div className="text-xs text-muted">{summarizePermissions(r.permissions)}</div>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleAssign} disabled={isSubmitting || !selectedRoleId}>
                {isSubmitting ? 'Assigning…' : 'Assign role'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/school-admin/roles')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
