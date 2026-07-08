import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell, Sidebar, Topbar, MobileTabBar, IconButton, Button, Card, Banner, Icon } from '@/components'
import { deleteRole, getRole, type Role } from '@/features/roles/api'
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
 * SC-039 · Delete Role Confirmation — SA (FR-018).
 *
 * Reuses the approved Sc039DeleteRole.tsx structure/components as-is
 * (Step 16). Fetches the real role first (for its name and live
 * `staff_count`) to decide between the design's `default`/`assigned`
 * states, rather than guessing.
 */
export function RoleDeleteScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { roleId } = useParams<{ roleId: string }>()
  const [role, setRole] = useState<Role | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!roleId) return
    let cancelled = false
    getRole(roleId)
      .then((result) => {
        if (!cancelled) setRole(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(extractErrorMessage(err, 'This role could not be found.'))
      })
    return () => {
      cancelled = true
    }
  }, [roleId])

  async function handleDelete() {
    if (!roleId) return
    setError(null)
    setIsDeleting(true)
    try {
      await deleteRole(roleId)
      navigate('/school-admin/roles', { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err, 'This role could not be deleted.'))
      setIsDeleting(false)
    }
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          brandSubtitle={user?.school_name ?? undefined}
          groups={schoolAdminNavGroups('roles')}
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
      mobileNav={<MobileTabBar items={schoolAdminTabs('roles')} />}
    >
      <div className="mx-auto max-w-md pt-6">
        <Card className="p-8">
          <div className="text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-danger-soft text-danger">
              <Icon name="alert" className="h-8 w-8" strokeWidth={2} />
            </span>
            <h1 className="mt-4 text-xl font-bold text-ink">
              Delete the &ldquo;{role?.name ?? '…'}&rdquo; role?
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              This permanently removes the role and its permissions.
            </p>
          </div>

          {role && role.staff_count > 0 && (
            <div className="mt-4">
              <Banner tone="warning">
                {role.staff_count} staff currently have this role. They&rsquo;ll lose all access
                until you assign them a new role.
              </Banner>
            </div>
          )}

          {error && (
            <div className="mt-4">
              <Banner tone="danger">{error}</Banner>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <Button variant="danger" onClick={handleDelete} disabled={isDeleting || !role}>
              {isDeleting ? 'Deleting…' : 'Delete role'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/school-admin/roles')}
              disabled={isDeleting}
            >
              Cancel
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
