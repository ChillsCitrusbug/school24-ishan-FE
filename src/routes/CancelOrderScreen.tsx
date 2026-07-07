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
  Badge,
  Banner,
  ErrorState,
  ResultHero,
  Spinner,
  Icon,
} from '@/components'
import { useAuth } from '@/features/auth/useAuth'
import { getStaffOrderDetail, cancelOrder, type StaffOrderDetail } from '@/features/orders/api'
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

/**
 * SC-080 · Cancellation & Refund Confirmation — Staff/School Admin
 * (FR-039). Reuses the approved Sc080CancelRefund.tsx structure
 * exactly: a destructive-confirm state (order items + total, "Cancel &
 * refund $X" / "Keep order") and a success state (ResultHero showing
 * the refunded amount). Reachable from OrderDetailScreen.tsx's own
 * "Cancel order" button — dropped there in FR-038 as a disclosed,
 * minimal scope reduction ("this ticket's own separate scope, not
 * built yet"), restored now that this ticket exists.
 */
export function CancelOrderScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isStaff = user?.role === 'staff'
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<StaffOrderDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelledOrder, setCancelledOrder] = useState<StaffOrderDetail | null>(null)

  useEffect(() => {
    if (!orderId) return
    getStaffOrderDetail(orderId)
      .then((result) => {
        setLoadError(null)
        setOrder(result)
      })
      .catch((err: unknown) => {
        setLoadError(extractErrorMessage(err, 'This order could not be loaded.'))
      })
  }, [orderId])

  async function handleCancel() {
    if (!order) return
    setCancelling(true)
    setActionError(null)
    try {
      const updated = await cancelOrder(order.id)
      setCancelledOrder(updated)
    } catch (err: unknown) {
      setActionError(extractErrorMessage(err, 'Could not cancel this order. Please try again.'))
    } finally {
      setCancelling(false)
    }
  }

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
      <div className="mx-auto max-w-md pt-6">
        <Card className="p-8">
          {loadError ? (
            <ErrorState message={loadError} />
          ) : order === null ? (
            <div role="status" aria-label="Loading order" className="flex justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : cancelledOrder ? (
            <ResultHero
              ok
              title="Order cancelled & refunded"
              message={`$${Number(cancelledOrder.total_amount).toFixed(2)} has been refunded to the funding wallet.`}
            >
              <div className="mt-2 w-full rounded-card bg-canvas p-4 text-center">
                <div className="text-xs text-muted">Order</div>
                <div className="text-xl font-bold tracking-wide text-ink">
                  #{cancelledOrder.display_id}
                </div>
                <div className="mt-1">
                  <Badge tone="accent">
                    Refunded ${Number(cancelledOrder.total_amount).toFixed(2)}
                  </Badge>
                </div>
              </div>
              <Button fullWidth className="mt-5" onClick={() => navigate('/school-admin/orders')}>
                Back to queue
              </Button>
            </ResultHero>
          ) : (
            <div className="flex flex-col items-center text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-danger-soft text-danger">
                <Icon name="alert" className="h-8 w-8" strokeWidth={2} />
              </span>
              <h1 className="mt-4 text-xl font-bold text-ink">Cancel order #{order.display_id}?</h1>
              <p className="mt-1 text-sm text-muted">
                This cancels {order.student_name}&rsquo;s order and refunds the full{' '}
                <b className="text-ink">${Number(order.total_amount).toFixed(2)}</b> (100%) to the
                funding wallet. This can&rsquo;t be undone.
              </p>

              {actionError && (
                <div className="mt-4 w-full">
                  <Banner tone="danger">{actionError}</Banner>
                </div>
              )}

              <div className="mt-4 w-full rounded-card bg-canvas p-4 text-left text-sm">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-ink">
                      <span className="text-muted">{item.quantity}×</span> {item.name}
                    </span>
                    <span className="font-medium text-ink">
                      ${Number(item.line_total).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="mt-1 flex items-center justify-between border-t border-line pt-2">
                  <span className="font-semibold text-ink">Refund</span>
                  <span className="font-bold text-ink">
                    ${Number(order.total_amount).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex w-full flex-col gap-2">
                <Button
                  variant="danger"
                  fullWidth
                  loading={cancelling}
                  onClick={handleCancel}
                >
                  Cancel &amp; refund ${Number(order.total_amount).toFixed(2)}
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => navigate(`/school-admin/orders/${order.id}`)}
                >
                  Keep order
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  )
}
