import { useLocation, useNavigate } from 'react-router-dom'
import {
  AppShell,
  Badge,
  Button,
  Card,
  ErrorState,
  MobileTabBar,
  ResultHero,
  Sidebar,
  Topbar,
} from '@/components'
import type { Order } from '@/features/checkout/api'
import { useAuth } from '@/features/auth/useAuth'
import { useStudentAuth } from '@/features/student-auth/useStudentAuth'

/**
 * SC-077 · Order Confirmation / Receipt — Student/Parent (FR-036/037,
 * shared). FR-036 shipped the Student-shell variant only; FR-037 adds
 * the Parent-shell variant here — both auth contexts are always
 * mounted (see `App.tsx`), so whichever identity is actually signed in
 * (Student or Parent) determines the shell, without needing two
 * separate route components.
 *
 * Reads the just-placed order from router navigation state (the
 * checkout response already carries everything this screen needs) —
 * there is no `GET /orders/{id}` endpoint yet to refetch from
 * (FR-040's own scope, not built in this batch), so landing here
 * directly (e.g. a refresh) shows a real, honest error state rather
 * than silently rendering nothing.
 */
export function ReceiptScreen() {
  const { student } = useStudentAuth()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { order?: Order; childId?: string } | null
  const order = state?.order ?? null
  const childId = state?.childId

  // Checks the actual authoritative signal (the parent's own role,
  // which `RequireRole(['parent'])` already guarantees is true on this
  // route) rather than inferring "is Parent" from the Student identity
  // being absent — both auth contexts are always-mounted and in-memory
  // only, so an absence check could misfire if both ever ended up
  // signed in within the same session.
  const isParent = user?.role === 'parent'
  const backHref = isParent && childId ? `/parent/menu?childId=${childId}` : '/student/menu'
  const backLabel = isParent ? 'Back to menu' : 'Done'

  const money = (n: string) => `$${Number(n).toFixed(2)}`

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={[]}
          user={{
            initials: '',
            name: isParent ? (user?.full_name ?? '') : (student?.full_name ?? ''),
            role: isParent ? 'Parent' : 'Student',
          }}
        />
      }
      topbar={<Topbar searchPlaceholder="Search…" />}
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-lg pt-4">
        {order === null ? (
          <Card className="p-6">
            <ErrorState
              message="No order details to show. Your order was placed, but this receipt can only be viewed right after checkout."
              action={
                <Button variant="secondary" onClick={() => navigate(backHref)}>
                  Back to menu
                </Button>
              }
            />
          </Card>
        ) : (
          <Card className="p-8">
            <ResultHero
              ok
              title="Order confirmed"
              message="Show your Order ID at the canteen counter to collect."
            >
              <div className="mt-2 w-full rounded-card bg-canvas p-4 text-center">
                <div className="text-xs text-muted">Order ID</div>
                <div className="text-2xl font-bold tracking-wide text-ink">{order.display_id}</div>
                <div className="mt-1">
                  <Badge tone="warning">Pending — show at counter</Badge>
                </div>
              </div>

              <ul className="mt-4 w-full divide-y divide-line text-left text-sm">
                {order.items.map((line, i) => (
                  <li key={i} className="flex items-center justify-between py-2">
                    <span className="text-ink">
                      <span className="text-muted">{line.quantity}×</span> {line.name}
                      {line.variant_label && (
                        <span className="text-muted"> · {line.variant_label}</span>
                      )}
                    </span>
                    <span className="font-medium text-ink">{money(line.line_total)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-1 flex w-full items-center justify-between border-t border-line pt-3 text-sm">
                <span className="text-muted">{isParent ? 'Paid from wallet' : 'Paid from your wallet'}</span>
                <span className="font-bold text-ink">{money(order.total_amount)}</span>
              </div>

              <div className="mt-5 flex w-full flex-col gap-2">
                <Button variant="secondary" fullWidth onClick={() => navigate(backHref)}>
                  {backLabel}
                </Button>
              </div>
            </ResultHero>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
