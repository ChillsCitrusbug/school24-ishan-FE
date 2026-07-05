import { Link, useSearchParams } from 'react-router-dom'
import { AppShell, Sidebar, Topbar, MobileTabBar, Banner, Card, EmptyState } from '@/components'
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
 *
 * FR-022 addition: this is `ChildSelectScreen.tsx`'s own default
 * `next` destination (the real ordering/top-up destinations, FR-037/
 * FR-029, don't exist yet) — a `?childId=` in the URL after returning
 * here is rendered as a minimal "context loaded" confirmation banner,
 * honestly proving the selection mechanism resolved a child rather
 * than pretending to be the real order/top-up flow.
 *
 * FR-023 addition: "My children" card links to the real
 * `MyChildrenScreen.tsx` (Sc061) — the canonical status home the
 * ticket's own field-reconciliation doc names.
 *
 * FR-032 addition: "Food restrictions" card routes through
 * `ChildSelectScreen` with `next=/parent/food-restrictions`, kept as
 * its own dedicated card rather than folded into any existing one.
 */
export function PlaceholderDashboard() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const selectedChildId = searchParams.get('childId')
  const roleLabel = user ? (ROLE_LABEL[user.role] ?? user.role) : ''

  return (
    <AppShell
      sidebar={<Sidebar brandTitle="School24" groups={[]} user={{ initials: '', name: user?.full_name ?? '', role: roleLabel }} />}
      topbar={<Topbar />}
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-6xl space-y-4">
        {selectedChildId && (
          <Banner tone="success">
            Ordering context loaded for the selected child (student ID {selectedChildId}). The
            actual ordering flow ships with a later ticket.
          </Banner>
        )}
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
                <div className="font-semibold text-ink">My children</div>
                <div className="text-sm text-muted">
                  See every linked child and their Approved/Pending status.
                </div>
              </div>
              <Link
                to="/parent/children"
                className="rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
              >
                View children
              </Link>
            </div>
          </Card>
        )}
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
        {user?.role === 'parent' && (
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-ink">Order for a child</div>
                <div className="text-sm text-muted">
                  Choose which linked child you're ordering for.
                </div>
              </div>
              <Link
                to="/parent/select-child"
                className="rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
              >
                Choose a child
              </Link>
            </div>
          </Card>
        )}
        {user?.role === 'parent' && (
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-ink">Top up a child's wallet</div>
                <div className="text-sm text-muted">
                  Add funds directly to a linked child's own wallet.
                </div>
              </div>
              <Link
                to="/parent/select-child?next=/parent/wallet/top-up-child"
                className="rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
              >
                Choose a child
              </Link>
            </div>
          </Card>
        )}
        {user?.role === 'parent' && (
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-ink">Food restrictions</div>
                <div className="text-sm text-muted">
                  Block a product or category for a linked child.
                </div>
              </div>
              <Link
                to="/parent/select-child?next=/parent/food-restrictions"
                className="rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
              >
                Choose a child
              </Link>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
