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
  CardHeader,
  EmptyState,
  ErrorState,
  Spinner,
  DateRangeButton,
} from '@/components'
import { useAuth } from '@/features/auth/useAuth'
import { getProductSalesReport, type ProductSalesRow } from '@/features/reports/api'
import { extractErrorMessage } from '@/lib/api-error'
import type { DateRangeSelection } from '@/lib/date-range-presets'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'

/**
 * SC-087 · Product Sales Report (ranked by popularity) — School Admin
 * (FR-045). Reuses the approved Sc087ProductSales.tsx structure,
 * including its own date-range button (`DateRangeButton`, a preset
 * picker — see that component's own docstring for why).
 */
export function ProductSalesScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<ProductSalesRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<DateRangeSelection>({ label: 'All time' })

  const load = useCallback(() => {
    if (!user?.school_id) return
    setError(null)
    setRows(null)
    getProductSalesReport(user.school_id, { date_from: range.date_from, date_to: range.date_to })
      .then(setRows)
      .catch((err: unknown) => setError(extractErrorMessage(err, 'Product sales could not be loaded.')))
  }, [user, range])

  useEffect(() => {
    load()
  }, [load])

  const topQty = rows && rows.length > 0 ? Math.max(...rows.map((r) => r.quantity_sold)) : 1

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
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">Product sales</h1>
            <p className="mt-0.5 text-sm text-muted">Most popular items by quantity sold.</p>
          </div>
          <div className="flex items-center gap-2">
            <DateRangeButton label={range.label} onSelect={setRange} />
            <Button variant="ghost" onClick={() => navigate('/school-admin/reports')}>
              Back to reports
            </Button>
          </div>
        </div>

        {error ? (
          <Card className="mt-6 p-6">
            <ErrorState message={error} action={<Button onClick={load}>Try again</Button>} />
          </Card>
        ) : rows === null ? (
          <div role="status" aria-label="Loading product sales" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon="chart"
              title="No sales in this range"
              message="Pick a different date range to see product sales."
            />
          </Card>
        ) : (
          <Card className="mt-5">
            <CardHeader title="Ranked by quantity" className="border-b border-line" />
            <ul className="divide-y divide-line">
              {rows.map((r) => (
                <li key={`${r.item_type}-${r.rank}`} className="flex items-center gap-3 px-5 py-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand-deep">
                    {r.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-ink">{r.name}</span>
                      <span className="text-sm text-muted">
                        {r.quantity_sold} sold · <span className="font-semibold text-ink">${r.revenue}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${(r.quantity_sold / topQty) * 100}%` }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
