import { Link } from 'react-router-dom'
import { AppShell, Sidebar, Topbar, MobileTabBar, Card, EmptyState } from '@/components'
import { useAuth } from '@/features/auth/useAuth'

const ROLE_LABEL: Record<string, string> = {
  platform_admin: 'Platform Admin',
  staff: 'Staff',
  parent: 'Parent',
}

/**
 * Generic authenticated landing for the 3 roles whose real dashboard isn't
 * built yet (platform_admin -> FR-010/SC-016, staff -> FR-018/SC-041,
 * parent -> FR-046/SC-063) — see docs/design/field-reconciliation/FR-001.md
 * for the recorded decision. Reuses the same AppShell wiring as every
 * other authenticated screen (proves the shell/session/tenant-scoping
 * plumbing works for these roles too) with a minimal placeholder in place
 * of business content this ticket does not own. Each owning ticket
 * replaces this route's content with its real screen — the route itself
 * does not change.
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
                <div className="text-sm text-muted">Add funds to top up your own wallet.</div>
              </div>
              <Link
                to="/parent/wallet/top-up"
                className="rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
              >
                Top up wallet
              </Link>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
