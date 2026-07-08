import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  Button,
  Card,
  Badge,
  StatusPill,
  ErrorState,
  Spinner,
  OrderTimeline,
  Icon,
  type TimelineStep,
} from '@/components'
import { getMyOrder, type StaffOrderDetail, type OrderStatus } from '@/features/orders/api'
import { useOrderTrackingSocket } from '@/features/orders/useOrderTrackingSocket'
import { extractErrorMessage } from '@/lib/api-error'
import { parentNavGroups, parentTabs } from './parentNav'
import { studentNavGroups, studentTabs } from './studentNav'

interface OrderTrackingScreenProps {
  role: 'parent' | 'student'
  displayName: string
  roleLabel: string
  backHref: string
  inboxHref: string
  paidFromLabel: string
}

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready']

const FORWARD_SEQUENCE: { status: OrderStatus; label: string }[] = [
  { status: 'pending', label: 'Order placed' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'preparing', label: 'Preparing' },
  { status: 'ready', label: 'Ready to collect' },
  { status: 'completed', label: 'Completed' },
]

function buildTimeline(order: StaffOrderDetail): TimelineStep[] {
  const currentIndex = FORWARD_SEQUENCE.findIndex((s) => s.status === order.status)
  return FORWARD_SEQUENCE.map((step, i) => ({
    label: step.label,
    state: i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming',
  }))
}

/**
 * SC-081 · Order Tracking (real-time, active orders) + SC-083 · Order
 * History Detail (immutable, terminal orders) — Student/Parent
 * (FR-041). One screen, not two, since a viewer navigating here from
 * the history list (Sc082) doesn't know in advance whether an order is
 * still active or already terminal — same "one detail screen, branch
 * on status" precedent as the Staff-facing OrderDetailScreen.tsx.
 *
 * Field-reconciliation decisions:
 * - The mock's own "Collect at" line (`order.pickup`) is dropped — no
 *   pickup-location concept exists anywhere in this schema.
 * - The mock's own "Re-order these items" button is deferred to
 *   FR-047, which explicitly owns quick re-order — not duplicated here.
 * - Real-time delivery is a genuine WebSocket
 *   (`useOrderTrackingSocket`), the user's own explicit choice
 *   overriding the ticket's own literal "push-triggered refetch, no
 *   WebSocket" text — see the field-reconciliation doc's decision #1.
 */
export function OrderTrackingScreen({
  role,
  displayName,
  roleLabel,
  backHref,
  inboxHref,
  paidFromLabel,
}: OrderTrackingScreenProps) {
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<StaffOrderDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!orderId) return
    getMyOrder(orderId)
      .then((result) => {
        setError(null)
        setOrder(result)
      })
      .catch((err: unknown) => setError(extractErrorMessage(err, 'This order could not be loaded.')))
  }, [orderId])

  useEffect(() => {
    load()
  }, [load])

  const handleStatusPush = useCallback(
    (message: { order_id: string }) => {
      if (message.order_id === orderId) load()
    },
    [orderId, load],
  )
  useOrderTrackingSocket(handleStatusPush)

  const isActive = order !== null && ACTIVE_STATUSES.includes(order.status)
  const isReady = order?.status === 'ready'
  const isCancelled = order?.status === 'cancelled'

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={role === 'parent' ? parentNavGroups() : studentNavGroups('orders')}
          user={{ initials: displayName.slice(0, 1).toUpperCase(), name: displayName, role: roleLabel }}
        />
      }
      topbar={
        <Topbar
          searchPlaceholder="Search…"
          right={<IconButton icon="bell" label="Notifications" onClick={() => navigate(inboxHref)} />}
        />
      }
      mobileNav={<MobileTabBar items={role === 'parent' ? parentTabs() : studentTabs('orders')} />}
    >
      <div className="mx-auto max-w-lg">
        <Button variant="ghost" size="sm" leadingIcon="chevronLeft" className="mb-3" onClick={() => navigate(backHref)}>
          My orders
        </Button>

        {error ? (
          <Card className="p-6">
            <ErrorState message={error} action={<Button onClick={load}>Try again</Button>} />
          </Card>
        ) : order === null ? (
          <div role="status" aria-label="Loading order" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-ink">Order #{order.display_id}</h1>
                <p className="mt-0.5 text-sm text-muted">
                  {new Date(order.placed_at).toLocaleString()}
                </p>
              </div>
              {isActive ? (
                <Badge tone={isReady ? 'success' : 'info'}>{isReady ? 'Ready' : 'Preparing'}</Badge>
              ) : (
                <StatusPill
                  tone={isCancelled ? 'accent' : 'success'}
                  label={isCancelled ? 'Cancelled' : 'Completed'}
                />
              )}
            </div>

            {isReady && (
              <div className="mt-4 flex items-center gap-2 rounded-card bg-success-soft px-4 py-3 text-sm font-medium text-success">
                <Icon name="check" className="h-5 w-5" strokeWidth={2} /> Ready to collect — head
                to the canteen counter now.
              </div>
            )}

            {isCancelled && (
              <div className="mt-4 flex items-center gap-2 rounded-card bg-accent/10 px-4 py-3 text-sm text-accent-deep">
                <Icon name="alert" className="h-4 w-4" /> This order was cancelled and fully
                refunded to the wallet.
              </div>
            )}

            {isActive && (
              <Card className="mt-4 p-5">
                <OrderTimeline steps={buildTimeline(order)} />
              </Card>
            )}

            <Card className="mt-4">
              <div className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">Order details</div>
              <ul className="divide-y divide-line">
                {order.items.map((item, i) => (
                  <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-ink">
                      <span className="text-muted">{item.quantity}×</span> {item.name}
                      {item.variant_label && <span className="text-muted"> · {item.variant_label}</span>}
                    </span>
                    <span className="font-medium text-ink">${Number(item.line_total).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-line px-4 py-3">
                <span className="font-semibold text-ink">Total</span>
                <span className="font-bold text-ink">${Number(order.total_amount).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between px-4 pb-4 text-sm">
                <span className="text-muted">Paid from</span>
                <span className="text-ink">{paidFromLabel}</span>
              </div>
            </Card>

            {!isActive && (
              <p className="mt-3 text-center text-xs text-muted">
                This is a final record and can’t be changed.
              </p>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
