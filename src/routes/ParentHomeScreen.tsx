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
  ChildCard,
  EmptyState,
  ErrorState,
  Icon,
  Spinner,
} from '@/components'
import { cn } from '@/lib/cn'
import { useAuth } from '@/features/auth/useAuth'
import { listMyChildren, type MyChild } from '@/features/my-children/api'
import { getSpendingReport, type SpendingReportOrder } from '@/features/parent-reports/api'
import { computeDateRangePreset } from '@/lib/date-range-presets'
import { extractErrorMessage } from '@/lib/api-error'
import { parentNavGroups, parentTabs } from './parentNav'

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * SC-063 · Parent Family Control Centre (Parent Home) — thesis: parent
 * control. Reuses the approved Sc063ParentHome.tsx structure. Replaces
 * `PlaceholderDashboard.tsx` now that this real dashboard is built
 * (same "placeholder retired once the real screen ships" precedent as
 * FR-010/FR-018/FR-047's own dashboards).
 *
 * "Total balance" and the children grid come from `listMyChildren()`
 * (FR-023's own endpoint — every approved child's `wallet_balance`,
 * plus any pending link request). "Spent this week" and "Recent
 * activity" reuse `getSpendingReport()` (FR-046) with a rolling 7-day
 * window rather than a NEW endpoint — the mock's own "spent this week"
 * stat is a rolling window in spirit, and a calendar-week boundary has
 * no dedicated backend support. The mock's own activity feed mixes
 * top-ups and orders illustratively; this reuses the report's own real
 * `orders` list (most recent 5) rather than also pulling in wallet
 * transactions for a second, unrelated feed.
 */
export function ParentHomeScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [children, setChildren] = useState<MyChild[] | null>(null)
  const [recentOrders, setRecentOrders] = useState<SpendingReportOrder[] | null>(null)
  const [spentThisWeek, setSpentThisWeek] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!user) return
    setError(null)
    listMyChildren()
      .then(setChildren)
      .catch((err: unknown) => setError(extractErrorMessage(err, 'Your family could not be loaded.')))

    const week = computeDateRangePreset('last_7_days')
    getSpendingReport(user.id, { dateFrom: week.date_from, dateTo: week.date_to })
      .then((report) => {
        setSpentThisWeek(report.total_spent)
        setRecentOrders(
          [...report.orders]
            .sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime())
            .slice(0, 5),
        )
      })
      .catch(() => {
        setSpentThisWeek('0.00')
        setRecentOrders([])
      })
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const isLoading = children === null && !error
  const approved = (children ?? []).filter((c) => c.status === 'approved')
  const pending = (children ?? []).filter((c) => c.status === 'pending')
  const totalBalance = approved.reduce((sum, c) => sum + (c.wallet_balance ?? 0), 0)
  const isEmpty = children !== null && children.length === 0

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={parentNavGroups('home')}
          user={{ initials: user ? initialsOf(user.full_name) : '', name: user?.full_name ?? '', role: 'Parent' }}
        />
      }
      topbar={
        <Topbar
          searchPlaceholder="Search children, orders, items…"
          right={
            <>
              <IconButton icon="bell" label="Notifications" onClick={() => navigate('/parent/inbox')} />
              <Button leadingIcon="plus" onClick={() => navigate('/parent/wallet/top-up')}>
                Top up wallet
              </Button>
            </>
          }
        />
      }
      mobileNav={<MobileTabBar items={parentTabs('home')} />}
    >
      <div className="mx-auto max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            Good morning{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="mt-0.5 text-sm text-muted">Here&rsquo;s your family&rsquo;s canteen at a glance.</p>
        </div>

        {error ? (
          <Card className="mt-6 p-6">
            <ErrorState message={error} action={<Button onClick={load}>Try again</Button>} />
          </Card>
        ) : isLoading ? (
          <div role="status" aria-label="Loading your family" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : isEmpty ? (
          <Card className="mt-6">
            <EmptyState
              icon="children"
              title="Add your first child"
              message="Link a child with their Student ID to top up their wallet, order food and set spending controls."
              action={
                <Button leadingIcon="plus" onClick={() => navigate('/parent/children/add')}>
                  Add a child
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label="Total balance"
                value={`$${totalBalance.toFixed(2)}`}
                icon="wallet"
                hint={`across ${approved.length} ${approved.length === 1 ? 'child' : 'children'}`}
              />
              <StatCard
                label="Spent this week"
                value={`$${spentThisWeek ?? '0.00'}`}
                icon="chart"
                hint={`${recentOrders?.length ?? 0} recent ${(recentOrders?.length ?? 0) === 1 ? 'order' : 'orders'}`}
              />
              <StatCard
                label="Approvals"
                value={pending.length > 0 ? `${pending.length} pending` : 'None pending'}
                icon="children"
                iconTone={pending.length > 0 ? 'accent' : 'brand'}
                hint={pending.length > 0 ? `${pending[0].full_name}'s link request` : 'All caught up'}
              />
            </div>

            <div className="mb-3 mt-7 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Your children</h2>
              <Button
                variant="ghost"
                size="sm"
                leadingIcon="plus"
                onClick={() => navigate('/parent/children/add')}
              >
                Add a child
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {approved.map((c) => (
                <ChildCard
                  key={c.link_id}
                  initials={initialsOf(c.full_name)}
                  name={c.full_name}
                  meta={c.class_name ?? ''}
                  balance={`$${(c.wallet_balance ?? 0).toFixed(2)}`}
                  low={(c.wallet_balance ?? 0) === 0}
                  onTopUp={() => navigate(`/parent/wallet/top-up-child?childId=${c.student_id}`)}
                  onLimits={() => navigate(`/parent/food-restrictions?childId=${c.student_id}`)}
                />
              ))}
            </div>
            {pending.length > 0 && (
              <div className="mt-4">
                <ChildCard key={pending[0].link_id} initials={initialsOf(pending[0].full_name)} name={pending[0].full_name} meta="" pending />
              </div>
            )}

            <Card className="mt-7">
              <CardHeader
                title="Recent activity"
                subtitle="across your family"
                action={
                  <Button variant="ghost" size="sm" onClick={() => navigate('/parent/spending-report')}>
                    View all
                  </Button>
                }
                className="border-b border-line"
              />
              {recentOrders !== null && recentOrders.length === 0 ? (
                <EmptyState
                  icon="chart"
                  title="No activity yet"
                  message="Orders and top-ups will show up here."
                />
              ) : (
                <ul className="divide-y divide-line">
                  {(recentOrders ?? []).map((o) => (
                    <li key={o.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="grid h-9 w-9 place-items-center rounded-control bg-mint text-muted">
                        <Icon name="order" className="h-4 w-4" strokeWidth={1.7} />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-ink">
                          {o.student_name} &middot; {o.items_summary}
                        </div>
                        <div className="text-xs text-muted">
                          {new Date(o.placed_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      <span className={cn('ml-auto text-sm font-semibold text-ink')}>-${o.total_amount}</span>
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
