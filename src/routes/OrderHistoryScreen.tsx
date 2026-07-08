import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  Button,
  Card,
  SegmentedControl,
  StatusPill,
  type StatusTone,
  EmptyState,
  ErrorState,
  Spinner,
  Icon,
} from '@/components'
import { listMyOrders, type StaffOrderSummary, type OrderStatus } from '@/features/orders/api'
import { extractErrorMessage } from '@/lib/api-error'
import { parentNavGroups, parentTabs } from './parentNav'
import { studentNavGroups, studentTabs } from './studentNav'

interface OrderHistoryScreenProps {
  role: 'parent' | 'student'
  displayName: string
  roleLabel: string
  orderHref: (orderId: string) => string
  menuHref: string
  inboxHref: string
}

const STATUS_DISPLAY: Record<OrderStatus, { tone: StatusTone; label: string }> = {
  pending: { tone: 'warning', label: 'Pending' },
  confirmed: { tone: 'info', label: 'Confirmed' },
  preparing: { tone: 'info', label: 'Preparing' },
  ready: { tone: 'success', label: 'Ready' },
  completed: { tone: 'neutral', label: 'Completed' },
  cancelled: { tone: 'accent', label: 'Cancelled' },
}

/**
 * SC-082 · Order History (active vs completed) — Student/Parent
 * (FR-041). Reuses the approved Sc082History.tsx structure, one shared
 * component parameterized by role (same precedent as WalletScreen.tsx).
 *
 * Field-reconciliation decision: the mock's own local `active =
 * ['Preparing', 'Pending']` fixture filter is INCOMPLETE (misses
 * Confirmed/Ready) — the real screen delegates active-vs-history
 * classification entirely to the backend's own `?view=` param
 * (`_ACTIVE_VIEW_STATUSES`/`_HISTORY_VIEW_STATUSES` in
 * `application/orders/services.py`), never a client-side label list.
 */
export function OrderHistoryScreen({
  role,
  displayName,
  roleLabel,
  orderHref,
  menuHref,
  inboxHref,
}: OrderHistoryScreenProps) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'active' | 'history'>('active')
  const [orders, setOrders] = useState<StaffOrderSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    setOrders(null)
    listMyOrders(tab)
      .then(setOrders)
      .catch((err: unknown) => setError(extractErrorMessage(err, 'Your orders could not be loaded.')))
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

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
          searchPlaceholder="Search orders…"
          right={<IconButton icon="bell" label="Notifications" onClick={() => navigate(inboxHref)} />}
        />
      }
      mobileNav={<MobileTabBar items={role === 'parent' ? parentTabs() : studentTabs('orders')} />}
    >
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-ink">My orders</h1>
        <p className="mt-0.5 text-sm text-muted">Track active orders and review past ones.</p>

        <div className="mt-5">
          <SegmentedControl
            ariaLabel="Order status"
            value={tab}
            onChange={(value) => setTab(value as 'active' | 'history')}
            segments={[
              { value: 'active', label: 'Active' },
              { value: 'history', label: 'Completed' },
            ]}
          />
        </div>

        {error ? (
          <Card className="mt-4 p-6">
            <ErrorState message={error} action={<Button onClick={load}>Try again</Button>} />
          </Card>
        ) : orders === null ? (
          <div role="status" aria-label="Loading your orders" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : orders.length === 0 ? (
          <Card className="mt-4">
            <EmptyState
              icon="clock"
              title="No orders yet"
              message="When you place a canteen order, it’ll appear here so you can track and re-order it."
              action={<Button leadingIcon="order" onClick={() => navigate(menuHref)}>Browse menu</Button>}
            />
          </Card>
        ) : (
          <Card className="mt-4 divide-y divide-line">
            {orders.map((order) => {
              const display = STATUS_DISPLAY[order.status]
              return (
                <button
                  key={order.id}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-canvas"
                  onClick={() => navigate(orderHref(order.id))}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink">#{order.display_id}</div>
                    <div className="truncate text-xs text-muted">
                      {new Date(order.placed_at).toLocaleString()} · {order.item_summary}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-ink">${Number(order.total_amount).toFixed(2)}</div>
                    <StatusPill tone={display.tone} label={display.label} />
                  </div>
                  <Icon name="chevronRight" className="h-4 w-4 text-muted" strokeWidth={2} />
                </button>
              )
            })}
          </Card>
        )}
      </div>
    </AppShell>
  )
}
