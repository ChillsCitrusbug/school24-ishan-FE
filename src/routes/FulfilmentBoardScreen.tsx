import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  OrderQueueCard,
  EmptyState,
  ErrorState,
  Card,
  Spinner,
} from '@/components'
import { useAuth } from '@/features/auth/useAuth'
import {
  listStaffOrders,
  advanceOrderStatus,
  type StaffOrderSummary,
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

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'completed',
}

const COLUMNS: { key: OrderStatus; label: string }[] = [
  { key: 'pending', label: 'New' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready to collect' },
]

function waitLabel(placedAt: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(placedAt).getTime()) / 60000))
  if (minutes < 1) return 'just now'
  return `${minutes} min ago`
}

/**
 * SC-078 · Order Fulfilment Board / Active Orders Queue — Staff/School
 * Admin (FR-038). Reuses the approved Sc078FulfilmentBoard.tsx
 * structure — the mock's own `COLUMN` fixture only has 3 statuses
 * (pending/preparing/ready), skipping "confirmed", the DB schema's
 * real 4th forward-non-terminal status; a "Confirmed" column is added
 * here to cover the real status set. Completed orders leave this
 * "active orders" queue entirely, matching the mock's own framing.
 */
export function FulfilmentBoardScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isStaff = user?.role === 'staff'
  const [orders, setOrders] = useState<StaffOrderSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [advancingId, setAdvancingId] = useState<string | null>(null)

  const load = useCallback(() => {
    listStaffOrders()
      .then((result) => {
        setError(null)
        setOrders(result)
      })
      .catch((err: unknown) => {
        setError(extractErrorMessage(err, 'The order queue could not be loaded.'))
      })
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [load])

  async function handleAdvance(order: StaffOrderSummary) {
    const next = NEXT_STATUS[order.status]
    if (!next) return
    setAdvancingId(order.id)
    setActionError(null)
    try {
      await advanceOrderStatus(order.id, next)
      load()
    } catch (err) {
      setActionError(extractErrorMessage(err, 'Could not advance this order. Please try again.'))
      load()
    } finally {
      setAdvancingId(null)
    }
  }

  const active = (orders ?? []).filter((o) => o.status !== 'completed' && o.status !== 'cancelled')

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
      topbar={
        <Topbar
          searchPlaceholder="Search by order # or student…"
          right={<IconButton icon="bell" label="Notifications" />}
        />
      }
      mobileNav={<MobileTabBar items={isStaff ? staffTabs('orders') : schoolAdminTabs('orders')} />}
    >
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">Order queue</h1>
            <p className="mt-0.5 text-sm text-muted">{user?.school_name ?? 'Your school'} canteen · today</p>
          </div>
          <span className="flex items-center gap-2 text-sm font-medium text-success">
            <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> Live
          </span>
        </div>

        {actionError && <p className="mt-3 text-sm text-danger">{actionError}</p>}

        {error ? (
          <Card className="mt-6">
            <ErrorState message={error} action={<button onClick={load}>Try again</button>} />
          </Card>
        ) : orders === null ? (
          <div role="status" aria-label="Loading order queue" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : active.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon="order"
              title="No active orders"
              message="New orders appear here the moment a family places them."
            />
          </Card>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            {COLUMNS.map((col) => {
              const columnOrders = active.filter((o) => o.status === col.key)
              return (
                <div key={col.key} className="rounded-card bg-mint/40 p-3">
                  <div className="mb-3 flex items-center justify-between px-1">
                    <div className="font-semibold text-ink">{col.label}</div>
                    <span className="text-sm text-muted">{columnOrders.length}</span>
                  </div>
                  <div className="space-y-3">
                    {columnOrders.map((o) => (
                      <OrderQueueCard
                        key={o.id}
                        id={o.display_id.replace(/^ORD-/, '')}
                        student={o.student_name}
                        cls={o.class_label ?? ''}
                        items={o.item_summary || `${o.item_count} item(s)`}
                        total={`$${Number(o.total_amount).toFixed(2)}`}
                        wait={waitLabel(o.placed_at)}
                        status={o.status as 'pending' | 'confirmed' | 'preparing' | 'ready'}
                        onOpen={() => navigate(`/school-admin/orders/${o.id}`)}
                        onAdvance={advancingId === o.id ? undefined : () => handleAdvance(o)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
