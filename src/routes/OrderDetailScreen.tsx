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
  Banner,
  ErrorState,
  Spinner,
  OrderTimeline,
  type TimelineStep,
} from '@/components'
import { useAuth } from '@/features/auth/useAuth'
import {
  getStaffOrderDetail,
  advanceOrderStatus,
  type StaffOrderDetail,
  type OrderStatus,
} from '@/features/orders/api'
import { extractErrorMessage } from '@/lib/api-error'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'
import { staffNavGroups, staffTabs } from './staffNav'

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

const FORWARD_SEQUENCE: { status: OrderStatus; label: string }[] = [
  { status: 'pending', label: 'Order placed' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'preparing', label: 'Preparing' },
  { status: 'ready', label: 'Ready to collect' },
  { status: 'completed', label: 'Completed' },
]

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'completed',
}

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: 'Confirm order',
  confirmed: 'Start preparing',
  preparing: 'Mark ready to collect',
  ready: 'Complete order',
}

const BADGE_TONE: Record<OrderStatus, 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'info',
  ready: 'success',
  completed: 'success',
  cancelled: 'danger',
}

function buildTimeline(order: StaffOrderDetail): TimelineStep[] {
  const currentIndex = FORWARD_SEQUENCE.findIndex((s) => s.status === order.status)
  return FORWARD_SEQUENCE.map((step, i) => ({
    label: step.label,
    state: i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming',
  }))
}

const CANCELLABLE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready']

/**
 * SC-079 · Order Detail & Status Control — Staff/School Admin (FR-038).
 * Reuses the approved Sc079OrderDetail.tsx structure. The mock's own
 * 4-step timeline skips "Confirmed" (same gap as Sc078's own card
 * component); a 5-step timeline is used here to match the real forward
 * sequence. The mock's own "Cancel order" button — dropped in FR-038 as
 * a disclosed scope reduction ("this ticket's own separate scope, not
 * built yet") — is restored now that FR-039 exists, navigating to
 * CancelOrderScreen.tsx (Sc080), shown only while the order is still in
 * a non-terminal status.
 */
export function OrderDetailScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isStaff = user?.role === 'staff'
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<StaffOrderDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [advancing, setAdvancing] = useState(false)

  const load = useCallback(() => {
    if (!orderId) return
    getStaffOrderDetail(orderId)
      .then((result) => {
        setError(null)
        setOrder(result)
      })
      .catch((err: unknown) => {
        setError(extractErrorMessage(err, 'This order could not be loaded.'))
      })
  }, [orderId])

  useEffect(() => {
    load()
  }, [load])

  async function handleAdvance() {
    if (!order) return
    const next = NEXT_STATUS[order.status]
    if (!next) return
    setAdvancing(true)
    setActionError(null)
    try {
      const updated = await advanceOrderStatus(order.id, next)
      setOrder(updated)
    } catch (err) {
      setActionError(extractErrorMessage(err, 'Could not advance this order. Please try again.'))
      load()
    } finally {
      setAdvancing(false)
    }
  }

  const nextLabel = order ? NEXT_LABEL[order.status] : undefined

  return (
    <AppShell
      sidebar={
        isStaff ? (
          <Sidebar
            brandTitle="School24"
            brandSubtitle={user?.school_name ?? undefined}
            groups={staffNavGroups('orders')}
            user={{ initials: initialsOf(user.full_name), name: user.full_name, role: 'Staff' }}
          />
        ) : (
          <Sidebar
            brandTitle="School24"
            brandSubtitle={user?.school_name ?? undefined}
            groups={schoolAdminNavGroups('orders')}
            user={{
              initials: user ? initialsOf(user.full_name) : '',
              name: user?.full_name ?? '',
              role: 'School Admin',
            }}
          />
        )
      }
      topbar={<Topbar searchPlaceholder="Search…" right={<IconButton icon="bell" label="Notifications" />} />}
      mobileNav={<MobileTabBar items={isStaff ? staffTabs('orders') : schoolAdminTabs('orders')} />}
    >
      <div className="mx-auto max-w-2xl">
        <Button variant="ghost" size="sm" leadingIcon="chevronLeft" className="mb-3" onClick={() => navigate('/school-admin/orders')}>
          Order queue
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
                  {order.student_name}
                  {order.class_label ? ` · ${order.class_label}` : ''}
                </p>
              </div>
              <Badge tone={BADGE_TONE[order.status]}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
            </div>

            {actionError && (
              <div className="mt-4">
                <Banner tone="danger">{actionError}</Banner>
              </div>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Card className="p-5">
                <div className="mb-3 text-sm font-semibold text-ink">Status</div>
                <OrderTimeline steps={buildTimeline(order)} />
              </Card>
              <Card>
                <div className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">Items</div>
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
              </Card>
            </div>

            {nextLabel ? (
              <>
                <Button fullWidth trailingIcon="arrowRight" className="mt-4" loading={advancing} onClick={handleAdvance}>
                  {nextLabel}
                </Button>
                <p className="mt-2 text-center text-xs text-muted">Status moves forward only.</p>
              </>
            ) : (
              <p className="mt-4 text-center text-xs text-muted">
                This order has reached a final status and can no longer be changed.
              </p>
            )}

            {CANCELLABLE_STATUSES.includes(order.status) && (
              <Button
                variant="danger"
                fullWidth
                className="mt-2"
                onClick={() => navigate(`/school-admin/orders/${order.id}/cancel`)}
              >
                Cancel order
              </Button>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
