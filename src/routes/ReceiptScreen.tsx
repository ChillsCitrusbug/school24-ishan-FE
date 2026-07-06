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
import { useStudentAuth } from '@/features/student-auth/useStudentAuth'

/**
 * SC-077 · Order Confirmation / Receipt — Student/Parent (FR-036/037,
 * shared). This ticket (FR-036) ships the Student-shell variant only;
 * the mock's own doc comment names this screen "Student/Parent" but
 * itself only ever renders the student sidebar/nav — a Parent-shell
 * variant is FR-037's own scope to add when it's built.
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
  const navigate = useNavigate()
  const location = useLocation()
  const order = (location.state as { order?: Order } | null)?.order ?? null

  const money = (n: string) => `$${Number(n).toFixed(2)}`

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={[]}
          user={{ initials: '', name: student?.full_name ?? '', role: 'Student' }}
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
                <Button variant="secondary" onClick={() => navigate('/student/menu')}>
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
                <span className="text-muted">Paid from your wallet</span>
                <span className="font-bold text-ink">{money(order.total_amount)}</span>
              </div>

              <div className="mt-5 flex w-full flex-col gap-2">
                <Button variant="secondary" fullWidth onClick={() => navigate('/student/menu')}>
                  Done
                </Button>
              </div>
            </ResultHero>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
