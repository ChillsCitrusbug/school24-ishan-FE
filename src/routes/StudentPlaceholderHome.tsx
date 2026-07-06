import { Link, useNavigate } from 'react-router-dom'
import { AppShell, Sidebar, Topbar, MobileTabBar, Card, EmptyState, IconButton } from '@/components'
import { useStudentAuth } from '@/features/student-auth/useStudentAuth'

/**
 * Generic authenticated landing for students (FR-002) — the real "school
 * canteen home" (SC-070, `Sc070StudentHome.tsx`) belongs to FR-047
 * (depends on FR-035/FR-041/FR-033). Same pattern as FR-001's
 * PlaceholderDashboard for the 3 roles without a real dashboard yet —
 * see docs/design/field-reconciliation/FR-002.md item 2.
 *
 * FR-044 addition: the topbar's bell now navigates to the student's own
 * real inbox. FR-035 addition: a "Browse menu" card, same pattern as
 * the existing wallet card — checkout (FR-036) isn't built yet, so the
 * copy still names that as upcoming, not menu browsing itself.
 */
export function StudentPlaceholderHome() {
  const { student } = useStudentAuth()
  const navigate = useNavigate()

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={[]}
          user={{ initials: '', name: student?.full_name ?? '', role: 'Student' }}
        />
      }
      topbar={
        <Topbar right={<IconButton icon="bell" label="Notifications" onClick={() => navigate('/student/inbox')} />} />
      }
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-6xl space-y-4">
        <Card>
          <EmptyState
            icon="clock"
            title="Canteen home coming soon"
            message="Checkout is still being built. You're signed in — this is just a placeholder home."
          />
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-ink">Canteen menu</div>
              <div className="text-sm text-muted">Browse the menu and add items to your cart.</div>
            </div>
            <Link
              to="/student/menu"
              className="rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
            >
              Browse menu
            </Link>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-ink">Your wallet</div>
              <div className="text-sm text-muted">Check your balance and top up your own wallet.</div>
            </div>
            <Link
              to="/student/wallet"
              className="rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
            >
              View wallet
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
