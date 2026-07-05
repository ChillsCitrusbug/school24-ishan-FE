import { Link } from 'react-router-dom'
import { AppShell, Sidebar, Topbar, MobileTabBar, Card, EmptyState } from '@/components'
import { useAuth } from '@/features/auth/useAuth'

const ROLE_LABEL: Record<string, string> = {
  parent: 'Parent',
}

/**
 * Generic authenticated landing for the roles whose real dashboard
 * isn't built yet — originally covered platform_admin/staff/parent
 * (see docs/design/field-reconciliation/FR-001.md for the recorded
 * decision); platform_admin's own real dashboard shipped with FR-010
 * (`PlatformDashboardScreen`) and staff's with FR-018
 * (`StaffPortalScreen`), each replacing this route's content per that
 * same decision — only `parent` (FR-046/SC-063) still uses this
 * placeholder. Reuses the same AppShell wiring as every other
 * authenticated screen with a minimal placeholder in place of business
 * content this ticket does not own.
 */
export function PlaceholderDashboard() {
  const { user } = useAuth()
  const roleLabel = user ? (ROLE_LABEL[user.role] ?? user.role) : ''

  return (
    <AppShell
      sidebar={<Sidebar brandTitle="School24" groups={[]} user={{ initials: '', name: user?.full_name ?? '', role: roleLabel }} />}
      topbar={<Topbar />}
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-6xl space-y-4">
        <Card>
          <EmptyState
            icon="clock"
            title="Dashboard coming soon"
            message={`The ${roleLabel} dashboard is being built. You're signed in — this is just a placeholder home.`}
          />
        </Card>
        {user?.role === 'parent' && (
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-ink">Your wallet</div>
                <div className="text-sm text-muted">Check your balance and top up your own wallet.</div>
              </div>
              <Link
                to="/parent/wallet"
                className="rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
              >
                View wallet
              </Link>
            </div>
          </Card>
        )}
        {user?.role === 'parent' && (
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-ink">Add a child</div>
                <div className="text-sm text-muted">
                  Link a child by their Student ID. Your school approves the request.
                </div>
              </div>
              <Link
                to="/parent/children/add"
                className="rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
              >
                Add child
              </Link>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
