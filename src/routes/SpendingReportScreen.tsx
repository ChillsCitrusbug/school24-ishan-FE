import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  Button,
  SegmentedControl,
  StatCard,
  Card,
  CardHeader,
  StatusPill,
  type StatusTone,
  EmptyState,
  ErrorState,
  Spinner,
} from '@/components'
import { useAuth } from '@/features/auth/useAuth'
import {
  getSpendingReport,
  type ChildSpendingSummary,
  type SpendingReport,
} from '@/features/parent-reports/api'
import { extractErrorMessage } from '@/lib/api-error'

const STATUS_TONE: Record<string, StatusTone> = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'info',
  ready: 'success',
  completed: 'neutral',
  cancelled: 'accent',
}

/**
 * SC-068 · Parent Spending Insights — Parent (FR-046). Reuses the
 * approved Sc068SpendingInsights.tsx structure where the underlying
 * data genuinely exists — the mock's own week-by-week bar chart,
 * category donut chart, and month-over-month % comparison have no
 * real backing data under this ticket's own DoD (no category
 * breakdown or prior-period baseline is named anywhere in it) and are
 * deliberately not built here, disclosed in
 * `docs/design/field-reconciliation/FR-046.md`. Consolidated (all
 * approved children) or filtered to one via the child SegmentedControl,
 * matching the ticket's own two acceptance scenarios exactly.
 */
export function SpendingReportScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [childId, setChildId] = useState<string>('all')
  // Every currently-approved child, sourced from the initial unfiltered
  // (consolidated) load — used purely to populate the child-filter
  // control, since a single-child-filtered report response only
  // includes that ONE child, not the full family list.
  const [allChildren, setAllChildren] = useState<ChildSpendingSummary[]>([])
  const [report, setReport] = useState<SpendingReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    getSpendingReport(user.id)
      .then((result) => setAllChildren(result.children))
      .catch(() => setAllChildren([]))
  }, [user])

  const load = useCallback(() => {
    if (!user) return
    setError(null)
    setReport(null)
    getSpendingReport(user.id, childId === 'all' ? undefined : childId)
      .then(setReport)
      .catch((err: unknown) =>
        setError(extractErrorMessage(err, 'Your spending report could not be loaded.')),
      )
  }, [user, childId])

  useEffect(() => {
    load()
  }, [load])

  const totalSpent = report ? report.children.reduce((sum, c) => sum + Number(c.total_spent), 0) : 0
  const totalOrders = report ? report.children.reduce((sum, c) => sum + c.order_count, 0) : 0
  const averageOrder = totalOrders > 0 ? totalSpent / totalOrders : 0

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={[]}
          user={{ initials: '', name: user?.full_name ?? '', role: 'Parent' }}
        />
      }
      topbar={
        <Topbar
          searchPlaceholder="Search children, orders…"
          right={<IconButton icon="bell" label="Notifications" onClick={() => navigate('/parent/inbox')} />}
        />
      }
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-ink">Spending insights</h1>
        <p className="mt-0.5 text-sm text-muted">
          See where your family’s canteen money goes.
        </p>

        <div className="mt-5 flex items-center gap-3">
          <span className="text-sm text-muted">Showing</span>
          <SegmentedControl
            ariaLabel="Filter by child"
            value={childId}
            onChange={setChildId}
            segments={[
              { value: 'all', label: 'All children' },
              ...allChildren.map((c) => ({ value: c.student_id, label: c.full_name })),
            ]}
          />
        </div>

        {error ? (
          <Card className="mt-4 p-6">
            <ErrorState message={error} action={<Button onClick={load}>Try again</Button>} />
          </Card>
        ) : report === null ? (
          <div role="status" aria-label="Loading your spending report" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total spent" value={`$${totalSpent.toFixed(2)}`} icon="wallet" />
              <StatCard label="Orders" value={totalOrders} icon="order" />
              <StatCard label="Average order" value={`$${averageOrder.toFixed(2)}`} icon="chart" />
              <StatCard label="Your own wallet" value={`$${Number(report.parent_wallet.balance).toFixed(2)}`} icon="wallet" iconTone="accent" />
            </div>

            <Card className="mt-4">
              <CardHeader title="By child" subtitle="wallet balance and spend" className="border-b border-line" />
              {report.children.length === 0 ? (
                <EmptyState icon="children" title="No approved children" message="Link a child to start tracking their canteen spending." />
              ) : (
                <ul className="divide-y divide-line">
                  {report.children.map((c) => (
                    <li key={c.student_id} className="flex items-center justify-between px-5 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-ink">{c.full_name}</div>
                        <div className="text-xs text-muted">{c.class_label ?? ''}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-ink">${Number(c.total_spent).toFixed(2)} spent</div>
                        <div className="text-xs text-muted">
                          ${Number(c.wallet_balance).toFixed(2)} balance · {c.order_count} orders
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="mt-4">
              <CardHeader title="Monthly summary" className="border-b border-line" />
              {report.monthly_summary.length === 0 ? (
                <EmptyState icon="chart" title="No spending yet" message="Once orders are placed, monthly totals will appear here." />
              ) : (
                <ul className="divide-y divide-line">
                  {report.monthly_summary.map((m) => (
                    <li key={m.month} className="flex items-center justify-between px-5 py-3 text-sm">
                      <span className="text-ink">{m.month}</span>
                      <span className="text-muted">{m.order_count} orders</span>
                      <span className="font-semibold text-ink">${Number(m.total_spent).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="mt-4">
              <CardHeader title="Transactions" subtitle="newest first" className="border-b border-line" />
              {report.orders.length === 0 ? (
                <EmptyState icon="order" title="No orders yet" message="Once a canteen order is placed from a child's wallet, it'll show here." />
              ) : (
                <ul className="divide-y divide-line">
                  {report.orders.map((o) => (
                    <li key={o.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-ink">
                          #{o.display_id} · {o.student_name}
                        </div>
                        <div className="text-xs text-muted">
                          {new Date(o.placed_at).toLocaleString()} · {o.item_count} item{o.item_count === 1 ? '' : 's'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-ink">${Number(o.total_amount).toFixed(2)}</div>
                        <StatusPill tone={STATUS_TONE[o.status] ?? 'neutral'} label={o.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
