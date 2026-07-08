import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  Button,
  StatCard,
  Card,
  CardHeader,
  BarChart,
  EmptyState,
  ErrorState,
  Spinner,
  DateRangeButton,
} from '@/components'
import { useAuth } from '@/features/auth/useAuth'
import {
  getDailyOrdersReport,
  getRevenueSummaryReport,
  type DailyOrdersReport,
  type RevenueSummaryReport,
} from '@/features/reports/api'
import { extractErrorMessage } from '@/lib/api-error'
import type { DateRangeSelection } from '@/lib/date-range-presets'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-warning',
  confirmed: 'bg-info',
  preparing: 'bg-info',
  ready: 'bg-info',
  completed: 'bg-success',
  cancelled: 'bg-accent',
}

/**
 * SC-086 · School Operational Reports (Daily Orders + Revenue) —
 * School Admin (FR-045). Reuses the approved Sc086Reports.tsx
 * structure, combining the `daily-orders` and `revenue-summary`
 * endpoints (the ticket's own DoD names them as 2 separate endpoints;
 * the mock shows both on one screen). Mock parity: the date-range
 * button (`DateRangeButton`, a preset picker — no calendar-grid
 * component exists in the design system to build a real one) and the
 * "▲ 7% vs [previous period]" revenue comparison hint are both wired
 * up to real backend data.
 */
export function ReportsScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [daily, setDaily] = useState<DailyOrdersReport | null>(null)
  const [revenue, setRevenue] = useState<RevenueSummaryReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<DateRangeSelection>({ label: 'All time' })

  const load = useCallback(() => {
    if (!user?.school_id) return
    setError(null)
    setDaily(null)
    setRevenue(null)
    const params = { date_from: range.date_from, date_to: range.date_to }
    Promise.all([
      getDailyOrdersReport(user.school_id, params),
      getRevenueSummaryReport(user.school_id, params),
    ])
      .then(([dailyResult, revenueResult]) => {
        setDaily(dailyResult)
        setRevenue(revenueResult)
      })
      .catch((err: unknown) => setError(extractErrorMessage(err, 'Reports could not be loaded.')))
  }, [user, range])

  useEffect(() => {
    load()
  }, [load])

  const isEmpty = daily !== null && daily.total_order_count === 0

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          brandSubtitle={user?.school_name ?? undefined}
          groups={schoolAdminNavGroups('reports')}
          user={{ initials: '', name: user?.full_name ?? '', role: 'School Admin' }}
        />
      }
      topbar={
        <Topbar
          searchPlaceholder="Search…"
          right={<IconButton icon="bell" label="Notifications" onClick={() => navigate('/school-admin/notifications')} />}
        />
      }
      mobileNav={<MobileTabBar items={schoolAdminTabs('reports')} />}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">Operational reports</h1>
            <p className="mt-0.5 text-sm text-muted">Orders and revenue across the canteen.</p>
          </div>
          <div className="flex items-center gap-2">
            <DateRangeButton label={range.label} onSelect={setRange} />
            <Button variant="secondary" onClick={() => navigate('/school-admin/reports/products')}>
              Product sales
            </Button>
          </div>
        </div>

        {error ? (
          <Card className="mt-6 p-6">
            <ErrorState message={error} action={<Button onClick={load}>Try again</Button>} />
          </Card>
        ) : daily === null || revenue === null ? (
          <div role="status" aria-label="Loading reports" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : isEmpty ? (
          <Card className="mt-6">
            <EmptyState
              icon="chart"
              title="No orders in this range"
              message="Pick a different date range, or check back once orders come in."
            />
          </Card>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Orders" value={daily.total_order_count} icon="order" />
              <StatCard
                label="Revenue"
                value={`$${revenue.total_revenue}`}
                icon="wallet"
                hint={
                  revenue.percent_change_vs_previous_period === null ? undefined : (
                    <span
                      className={`font-medium ${revenue.percent_change_vs_previous_period >= 0 ? 'text-success' : 'text-danger'}`}
                    >
                      {revenue.percent_change_vs_previous_period >= 0 ? '▲' : '▼'}{' '}
                      {Math.abs(revenue.percent_change_vs_previous_period)}% vs previous period
                    </span>
                  )
                }
              />
              <StatCard label="Average order" value={`$${revenue.average_order}`} icon="chart" />
              <StatCard
                label="Refunds"
                value={`$${revenue.refunds_total}`}
                icon="gift"
                iconTone="accent"
                hint={`${revenue.refunds_count} orders`}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader title="Orders by day" />
                <div className="px-5 pb-5 pt-2">
                  <BarChart
                    series={[{ label: 'Orders', color: '#0F8A78' }]}
                    groups={daily.days.map((d) => ({ label: d.date.slice(5), values: [d.order_count] }))}
                    formatValue={(n) => `${n}`}
                  />
                </div>
              </Card>

              <Card>
                <CardHeader title="Order status" />
                <ul className="divide-y divide-line">
                  {daily.status_breakdown.map((b) => (
                    <li key={b.status} className="flex items-center gap-3 px-5 py-3.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[b.status] ?? 'bg-muted'}`} />
                      <span className="text-sm text-ink">{STATUS_LABEL[b.status] ?? b.status}</span>
                      <span className="ml-auto font-semibold text-ink">{b.count}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
