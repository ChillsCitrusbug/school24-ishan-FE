import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AppShell,
  Banner,
  Button,
  Card,
  Dialog,
  InfoRow,
  MobileTabBar,
  Sidebar,
  Spinner,
  StatusPill,
  Avatar,
  Topbar,
  IconButton,
} from '@/components'
import { useAuth } from '@/features/auth/useAuth'
import * as usersApi from '@/features/users/api'
import { extractErrorMessage } from '@/lib/api-error'
import { platformAdminNavGroups, platformAdminTabs } from './platformAdminNav'

const ROLE_LABEL: Record<usersApi.PlatformUser['role'], string> = {
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
 * SC-021 · Cross-School User Detail (activate/deactivate) — Platform
 * Admin (FR-009). Reuses FR-008's own review-fixed dialog pattern: an
 * error on the deactivate confirm renders INSIDE the Dialog, not in the
 * outer view-mode banner behind it (the modal's own overlay makes
 * anything behind it unreadable to a real user).
 */
export function UserDetailScreen() {
  const { userId } = useParams<{ userId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [target, setTarget] = useState<usersApi.PlatformUser | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [statusSaving, setStatusSaving] = useState(false)

  useEffect(() => {
    if (!userId) return
    let mounted = true
    usersApi
      .getUser(userId)
      .then((data) => {
        if (mounted) setTarget(data)
      })
      .catch((err: unknown) => {
        if (mounted) setLoadError(extractErrorMessage(err, 'Unable to load this user.'))
      })
    return () => {
      mounted = false
    }
  }, [userId])

  async function handleDeactivate() {
    if (!userId) return
    setStatusError(null)
    setStatusSaving(true)
    try {
      const updated = await usersApi.setUserStatus(userId, false)
      setTarget(updated)
      setStatusDialogOpen(false)
    } catch (err) {
      setStatusError(extractErrorMessage(err, 'Unable to deactivate this user.'))
    } finally {
      setStatusSaving(false)
    }
  }

  async function handleReactivate() {
    if (!userId) return
    setStatusError(null)
    setStatusSaving(true)
    try {
      const updated = await usersApi.setUserStatus(userId, true)
      setTarget(updated)
    } catch (err) {
      setStatusError(extractErrorMessage(err, 'Unable to reactivate this user.'))
    } finally {
      setStatusSaving(false)
    }
  }

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
        <Topbar right={<IconButton icon="bell" label="Notifications" />} />
      }
      mobileNav={<MobileTabBar items={platformAdminTabs('users')} />}
    >
      <div className="mx-auto max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate('/platform-admin/users')}
        >
          Users
        </Button>

        {loadError && <Banner tone="danger">{loadError}</Banner>}

        {!target && !loadError && (
          <div role="status" aria-label="Loading user" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {target && (
          <>
            {/* Only shown for the reactivate flow (no dialog) — a
                deactivate-flow error renders inside the still-open
                dialog itself instead, never both at once (FR-008's own
                review-fixed pattern). */}
            {statusError && !statusDialogOpen && (
              <div className="mb-3">
                <Banner tone="danger">{statusError}</Banner>
              </div>
            )}

            <Card className="mt-1">
              <div className="flex items-center gap-4 p-5">
                <Avatar initials={initialsOf(target.full_name)} tone="brand" size="lg" />
                <div>
                  <div className="text-lg font-bold text-ink">{target.full_name}</div>
                  <div className="text-sm text-muted">
                    {ROLE_LABEL[target.role]} · {target.school_name ?? '—'}
                  </div>
                </div>
                <StatusPill
                  tone={target.is_active ? 'success' : 'neutral'}
                  label={target.is_active ? 'Active' : 'Deactivated'}
                  className="ml-auto"
                />
              </div>
              <div className="divide-y divide-line border-t border-line">
                <InfoRow label="User ID" value={target.id} />
                <InfoRow label="Role" value={ROLE_LABEL[target.role]} />
                <InfoRow label="School" value={target.school_name ?? '—'} />
                <InfoRow label="Email" value={target.email} />
              </div>
            </Card>

            <div className="mt-4">
              {target.is_active ? (
                <>
                  <Button
                    variant="danger"
                    fullWidth
                    onClick={() => {
                      setStatusError(null)
                      setStatusDialogOpen(true)
                    }}
                  >
                    Deactivate user
                  </Button>
                  <p className="mt-2 text-center text-xs text-muted">
                    The user is signed out immediately and notified by email.
                  </p>
                </>
              ) : (
                <>
                  <Button variant="secondary" fullWidth loading={statusSaving} onClick={handleReactivate}>
                    Reactivate user
                  </Button>
                  <p className="mt-2 text-center text-xs text-muted">
                    The user regains access immediately and is notified by email.
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {target && (
        <Dialog
          open={statusDialogOpen}
          onClose={() => {
            setStatusDialogOpen(false)
            setStatusError(null)
          }}
          tone="danger"
          title={`Deactivate ${target.full_name}?`}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setStatusDialogOpen(false)
                  setStatusError(null)
                }}
              >
                Cancel
              </Button>
              <Button variant="danger" loading={statusSaving} onClick={handleDeactivate}>
                Deactivate &amp; email
              </Button>
            </>
          }
        >
          {statusError && (
            <div className="mb-3">
              <Banner tone="danger">{statusError}</Banner>
            </div>
          )}
          This signs {target.full_name} out of all devices and blocks sign-in until reactivated.
          They&rsquo;ll be notified by email.
        </Dialog>
      )}
    </AppShell>
  )
}
