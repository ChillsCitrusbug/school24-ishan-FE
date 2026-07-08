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
  BarChart,
  DonutChart,
  DataTable,
  Avatar,
  Badge,
  type Tone,
  StatusPill,
  type StatusTone,
  Pagination,
  EmptyState,
  ErrorState,
  Spinner,
  DateRangeButton,
  type Column,
} from '@/components'
import { useAuth } from '@/features/auth/useAuth'
import {
  getSpendingReport,
  exportSpendingReport,
  type ChildSpendingSummary,
  type SpendingReport,
  type SpendingReportOrder,
} from '@/features/parent-reports/api'
import { extractErrorMessage } from '@/lib/api-error'
import type { DateRangeSelection } from '@/lib/date-range-presets'

const STATUS_TONE: Record<string, StatusTone> = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'info',
  ready: 'info',
  completed: 'success',
  cancelled: 'accent',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Refunded',
}

const CHILD_COLORS = ['#0F8A78', '#7FC8B8', '#F28C45', '#2D7DB0', '#B0752D']
const CATEGORY_COLORS = ['#0F8A78', '#F28C45', '#1E8E5A', '#2D7DB0', '#B0752D', '#8A5FB0']
const CATEGORY_TONES: Tone[] = ['brand', 'accent', 'success', 'info', 'warning', 'neutral']
const PAGE_SIZE = 6

function toneForCategory(label: string, allLabels: string[]): Tone {
  const index = allLabels.indexOf(label)
  return CATEGORY_TONES[index % CATEGORY_TONES.length] ?? 'neutral'
}

/**
 * SC-068 · Parent Spending Insights — Parent (FR-046). Full mock parity
 * with the approved Sc068SpendingInsights.tsx: StatCards (with a "vs
 * previous period" comparison and a top-category card), a per-week
 * spend-by-child bar chart, a spend-by-category donut chart, a
 * paginated transactions table, and CSV/XLSX/PDF export — all wired to
 * real backend data. The date-range picker (`DateRangeButton`) defaults
 * to "This month" on load so the comparison/weekly-chart have a
 * meaningful range from the start (an "all time" report has no
 * well-defined prior period or week buckets).
 */
export function SpendingReportScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [childId, setChildId] = useState<string>('all')
  const [allChildren, setAllChildren] = useState<ChildSpendingSummary[]>([])
  const [report, setReport] = useState<SpendingReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<DateRangeSelection>(() => {
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const toISO = (d: Date) => d.toISOString().slice(0, 10)
    const month = from.toLocaleDateString('en-US', { month: 'long' })
    return {
      date_from: toISO(from),
      date_to: toISO(to),
      label: `${from.getDate()}–${to.getDate()} ${month} ${from.getFullYear()}`,
    }
  })
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!user) return
    getSpendingReport(user.id, { dateFrom: range.date_from, dateTo: range.date_to })
      .then((result) => setAllChildren(result.children))
      .catch(() => setAllChildren([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const load = useCallback(() => {
    if (!user) return
    setError(null)
    setReport(null)
    getSpendingReport(user.id, {
      childId: childId === 'all' ? undefined : childId,
      dateFrom: range.date_from,
      dateTo: range.date_to,
    })
      .then(setReport)
      .catch((err: unknown) =>
        setError(extractErrorMessage(err, 'Your spending report could not be loaded.')),
      )
  }, [user, childId, range])

  useEffect(() => {
    load()
    setPage(1)
  }, [load])

  function handleExport() {
    if (!user) return
    exportSpendingReport(
      user.id,
      { childId: childId === 'all' ? undefined : childId, dateFrom: range.date_from, dateTo: range.date_to },
      'csv',
    )
      .then((blob) => {
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'spending_report.csv'
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
      })
      .catch(() => setError('The export could not be downloaded. Please try again.'))
  }

  const categoryLabels = report?.by_category.map((c) => c.label) ?? []
  const donutSegments = (report?.by_category ?? []).map((c, i) => ({
    label: c.label,
    value: Number(c.total_spent),
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }))

  const childNames = report?.children.map((c) => c.full_name) ?? []
  const barSeries = childNames.map((name, i) => ({
    label: name,
    color: CHILD_COLORS[i % CHILD_COLORS.length],
  }))
  const barGroups = (report?.by_week ?? []).map((week) => ({
    label: week.week_label,
    values: childNames.map(
      (name) => Number(week.children.find((c) => c.student_name === name)?.total_spent ?? 0),
    ),
  }))

  const paginatedOrders = report ? report.orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : []
  const pageCount = report ? Math.max(1, Math.ceil(report.orders.length / PAGE_SIZE)) : 1

  const columns: Column<SpendingReportOrder>[] = [
    {
      key: 'date',
      header: 'Date',
      cell: (r) => new Date(r.placed_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      tdClassName: 'whitespace-nowrap text-muted',
    },
    {
      key: 'child',
      header: 'Child',
      cell: (r) => (
        <span className="inline-flex items-center gap-2">
          <Avatar initials={r.student_name[0] ?? ''} size="sm" />
          {r.student_name}
        </span>
      ),
    },
    { key: 'items', header: 'Items', cell: (r) => <span className="text-ink">{r.items_summary}</span> },
    {
      key: 'category',
      header: 'Category',
      cell: (r) => <Badge tone={toneForCategory(r.category, categoryLabels)}>{r.category}</Badge>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (r) => <span className="whitespace-nowrap font-semibold text-ink">${r.total_amount}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <StatusPill tone={STATUS_TONE[r.status] ?? 'neutral'} label={STATUS_LABEL[r.status] ?? r.status} />
      ),
    },
  ]

  const noApprovedChildren = report !== null && report.children.length === 0

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
          searchPlaceholder="Search children, orders, items…"
          right={<IconButton icon="bell" label="Notifications" onClick={() => navigate('/parent/inbox')} />}
        />
      }
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Spending insights</h1>
            <p className="mt-0.5 text-sm text-muted">
              See where your family&rsquo;s canteen money goes — by child, week and category.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DateRangeButton label={range.label} onSelect={setRange} />
            <Button variant="secondary" leadingIcon="export" onClick={handleExport}>
              Export
            </Button>
          </div>
        </div>

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
        ) : noApprovedChildren ? (
          <Card className="mt-4">
            <EmptyState icon="children" title="No approved children" message="Link a child to start tracking their canteen spending." />
          </Card>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total spent"
                value={`$${report.total_spent}`}
                icon="wallet"
                hint={
                  report.percent_change_vs_previous_period === null ? undefined : (
                    <span
                      className={`font-medium ${report.percent_change_vs_previous_period >= 0 ? 'text-danger' : 'text-success'}`}
                    >
                      {report.percent_change_vs_previous_period >= 0 ? '▲' : '▼'}{' '}
                      {Math.abs(report.percent_change_vs_previous_period)}% vs previous period
                    </span>
                  )
                }
              />
              <StatCard label="Orders" value={report.total_order_count} icon="order" />
              <StatCard label="Average order" value={`$${report.average_order}`} icon="chart" />
              {report.top_category ? (
                <StatCard
                  label="Top category"
                  value={report.top_category.label}
                  icon="order"
                  iconTone="accent"
                  hint={`$${report.top_category.total_spent} · ${report.top_category.percent_of_total}% of spend`}
                />
              ) : (
                <StatCard label="Your own wallet" value={`$${report.parent_wallet.balance}`} icon="wallet" iconTone="accent" />
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader
                  title="Spend by week"
                  subtitle={`${range.label} · per child`}
                  action={
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      {report.children.map((c, i) => (
                        <span key={c.student_id} className="flex items-center gap-1.5">
                          <span
                            className="h-3 w-3 rounded-sm"
                            style={{ background: CHILD_COLORS[i % CHILD_COLORS.length] }}
                          />
                          {c.full_name} <b className="ml-0.5 text-ink">${c.total_spent}</b>
                        </span>
                      ))}
                    </div>
                  }
                />
                <div className="px-5 pb-5 pt-2">
                  {barGroups.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted">No weekly data for this range.</p>
                  ) : (
                    <BarChart series={barSeries} groups={barGroups} formatValue={(n) => `$${n}`} />
                  )}
                </div>
              </Card>

              <Card>
                <CardHeader title="By category" subtitle={range.label} />
                <div className="px-5 pb-5 pt-2">
                  {donutSegments.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted">No category data yet.</p>
                  ) : (
                    <DonutChart
                      segments={donutSegments}
                      centerValue={`$${report.total_spent}`}
                      formatValue={(n) => `$${n.toFixed(2)}`}
                    />
                  )}
                </div>
              </Card>
            </div>

            <Card className="mt-4">
              <CardHeader title="Transactions" subtitle="newest first" className="border-b border-line" />
              {report.orders.length === 0 ? (
                <EmptyState icon="order" title="No orders yet" message="Once a canteen order is placed from a child's wallet, it'll show here." />
              ) : (
                <>
                  <DataTable columns={columns} rows={paginatedOrders} rowKey={(r) => r.id} />
                  <div className="border-t border-line px-5 py-3">
                    <Pagination
                      summary={`Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, report.orders.length)} of ${report.orders.length}`}
                      page={page}
                      pageCount={pageCount}
                      onPage={setPage}
                    />
                  </div>
                </>
              )}
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
