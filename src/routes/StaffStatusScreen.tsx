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
  Banner,
  Icon,
  Spinner,
} from '@/components'
import { getStaffDetail, setStaffStatus, type StaffDetail } from '@/features/staff/api'
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
 * SC-036 · Staff Activate/Deactivate Confirmation — School Admin
 * (FR-016). Reuses the approved Sc036StaffStatus.tsx structure exactly
 * — a separate routed confirmation screen (matching AssignRoleScreen's
 * own precedent), NOT the inline Dialog-on-detail-screen pattern
 * FR-008/009 used for schools/users (field-reconciliation decision #1).
 * Both deactivate AND reactivate go through this same confirm step
 * (decision #2), unlike FR-008/009's single-click reactivate.
 */
export function StaffStatusScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { staffId } = useParams<{ staffId: string }>()
  const [staff, setStaff] = useState<StaffDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!staffId) return
    let cancelled = false
    getStaffDetail(staffId)
      .then((result) => {
        if (!cancelled) setStaff(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(extractErrorMessage(err, 'This staff member could not be found.'))
      })
    return () => {
      cancelled = true
    }
  }, [staffId])

  const isDeactivating = staff?.status !== 'deactivated'

  async function handleConfirm() {
    if (!staffId || !staff) return
    setError(null)
    setIsSubmitting(true)
    try {
      await setStaffStatus(staffId, !isDeactivating)
      navigate(`/school-admin/staff/${staffId}`, { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err, 'This staff member’s status could not be changed.'))
      setIsSubmitting(false)
    }
  }

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
      <div className="mx-auto max-w-md pt-6">
        {!staff && !loadError && (
          <div role="status" aria-label="Loading staff member" className="flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {loadError && (
          <Card className="p-8">
            <Banner tone="danger">{loadError}</Banner>
          </Card>
        )}

        {staff && (
          <Card className="p-8 text-center">
            <span
              className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${
                isDeactivating ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'
              }`}
            >
              <Icon name={isDeactivating ? 'lock' : 'check'} className="h-8 w-8" strokeWidth={2} />
            </span>
            <h1 className="mt-4 text-xl font-bold text-ink">
              {isDeactivating ? `Deactivate ${staff.full_name}?` : `Reactivate ${staff.full_name}?`}
            </h1>

            {error && (
              <div className="mt-3">
                <Banner tone="danger">{error}</Banner>
              </div>
            )}

            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              {isDeactivating
                ? `${staff.full_name} loses access immediately and is signed out of all devices. They'll be notified by email.`
                : `${staff.full_name} will regain access to their granted modules. They'll be notified by email.`}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button
                variant={isDeactivating ? 'danger' : 'primary'}
                loading={isSubmitting}
                onClick={handleConfirm}
              >
                {isDeactivating ? 'Deactivate & email' : 'Reactivate & email'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(`/school-admin/staff/${staff.staff_profile_id}`)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
