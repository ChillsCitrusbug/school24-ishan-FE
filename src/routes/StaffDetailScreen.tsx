import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  Button,
  Card,
  Avatar,
  StatusPill,
  Banner,
  InfoRow,
  Spinner,
} from '@/components'
import { getStaffDetail, type StaffDetail, type StaffStatus } from '@/features/staff/api'
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
 * SC-095 · Staff Detail (read-only record / action hub) — School Admin
 * (FR-015). Reuses the approved Sc095StaffDetail.tsx structure.
 *
 * Field-reconciliation decision #4: "Resend invite" (no DoD line
 * anywhere in this ticket) and "Deactivate/Reactivate" (explicitly
 * FR-016's own separate ticket) are both out of scope — their buttons
 * render but do nothing yet, same "inert until that ticket ships"
 * convention already used for sidebar nav items pointing at unbuilt
 * routes.
 */
export function StaffDetailScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { staffId } = useParams<{ staffId: string }>()
  const [staff, setStaff] = useState<StaffDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!staffId) return
    let cancelled = false
    getStaffDetail(staffId)
      .then((result) => {
        if (!cancelled) setStaff(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(extractErrorMessage(err, 'This staff member could not be found.'))
      })
    return () => {
      cancelled = true
    }
  }, [staffId])

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
      topbar={<Topbar right={<IconButton icon="bell" label="Notifications" />} />}
      mobileNav={<MobileTabBar items={schoolAdminTabs('staff')} />}
    >
      <div className="mx-auto max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate('/school-admin/staff')}
        >
          Staff
        </Button>

        {error && <Banner tone="danger">{error}</Banner>}

        {!staff && !error && (
          <div role="status" aria-label="Loading staff member" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {staff && (
          <>
            <div className="flex items-center gap-4">
              <Avatar
                initials={initialsOf(staff.full_name)}
                tone={staff.status === 'deactivated' ? 'neutral' : 'brand'}
                size="lg"
              />
              <div>
                <h1 className="text-2xl font-bold text-ink">{staff.full_name}</h1>
                <p className="mt-0.5 text-sm text-muted">{staff.email}</p>
              </div>
              <StatusPill
                tone={STATUS_PILL[staff.status].tone}
                label={STATUS_PILL[staff.status].label}
                className="ml-auto"
              />
            </div>

            {staff.status === 'pending' && (
              <div className="mt-4">
                <Banner tone="warning">
                  This staff member hasn&rsquo;t accepted their invite yet, so they can&rsquo;t sign in.
                </Banner>
              </div>
            )}
            {staff.status === 'deactivated' && (
              <div className="mt-4">
                <Banner tone="warning">
                  This staff member is deactivated and has no access until reactivated.
                </Banner>
              </div>
            )}

            <Card className="mt-4">
              <div className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">
                Record
              </div>
              <div className="divide-y divide-line">
                <InfoRow label="Staff ID" value={staff.staff_profile_id} />
                <InfoRow label="Email" value={staff.email} />
                <InfoRow label="Mobile" value={staff.mobile || '—'} />
                <InfoRow label="Position" value={staff.position} />
                <InfoRow label="Department" value={staff.department || '—'} />
                <InfoRow label="Role" value={staff.role_name ?? 'No role assigned'} />
                <InfoRow label="Status" value={STATUS_PILL[staff.status].label} />
              </div>
            </Card>

            <Card className="mt-4 p-4">
              <div className="mb-3 text-sm font-semibold text-ink">Actions</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon="user"
                  onClick={() => navigate(`/school-admin/staff/${staff.staff_profile_id}/edit`)}
                >
                  Edit details
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon="shield"
                  onClick={() => navigate(`/school-admin/staff/${staff.staff_profile_id}/assign-role`)}
                >
                  Assign role
                </Button>
                {staff.status === 'pending' ? (
                  <Button variant="secondary" size="sm" leadingIcon="bell" disabled>
                    Resend invite
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" disabled>
                    {staff.status === 'deactivated' ? 'Reactivate' : 'Deactivate'}
                  </Button>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
