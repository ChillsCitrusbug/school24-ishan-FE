import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  Card,
  CardHeader,
  StatCard,
  BarChart,
  EmptyState,
  ErrorState,
  Button,
  Spinner,
} from '@/components'
import { getPlatformDashboard, type PlatformDashboard } from '@/features/analytics/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { platformAdminNavGroups, platformAdminTabs } from './platformAdminNav'

const ROLE_LABEL: Record<keyof PlatformDashboard['users_by_role'], string> = {
  platform_admin: 'Platform Admins',
  school_admin: 'School Admins',
  staff: 'Staff',
  parent: 'Parents',
}

/**
 * SC-016 · Platform Admin Home / Analytics Dashboard (FR-010). Reuses
 * the approved Sc016Analytics.tsx structure/components as-is, per the
 * FR-001 field-reconciliation note replacing PlaceholderDashboard's
 * content at this same `/platform-admin` route.
 *
 * Field-reconciliation decision #2: the mock has no dedicated UI slot
 * for a role-by-role user breakdown — additional StatCards are added
 * for School Admin/Staff/Parent/Platform Admin counts, the same
 * already-approved component the mock already uses 4 times.
 * Decision #3: the mock's own "Orders today"/"Revenue (month)" cards
 * are relabeled "Total orders"/"Total revenue" to match the ticket's
 * own all-time DoD rather than inventing unrequested time-windowing.
 */
export function PlatformDashboardScreen() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState<PlatformDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const load = useCallback(() => {
    setError(null)
    getPlatformDashboard()
      .then((result) => {
        if (mountedRef.current) setDashboard(result)
      })
      .catch((err: unknown) => {
        if (mountedRef.current) setError(extractErrorMessage(err, 'Something went wrong.'))
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const isLoading = dashboard === null && !error

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          brandSubtitle="Platform"
          groups={platformAdminNavGroups('home')}
          user={{
            initials: user ? user.full_name.slice(0, 1).toUpperCase() : '',
            name: user?.full_name ?? '',
            role: 'Platform Admin',
          }}
        />
      }
      topbar={
        <Topbar
          searchPlaceholder="Search schools, users…"
          right={<IconButton icon="bell" label="Notifications" />}
        />
      }
      mobileNav={<MobileTabBar items={platformAdminTabs('home')} />}
    >
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-ink">Platform overview</h1>
        <p className="mt-0.5 text-sm text-muted">Activity across all schools on School24.</p>

        {isLoading ? (
          <div role="status" aria-label="Loading dashboard" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : error ? (
          <Card className="mt-6">
            <ErrorState
              message={error}
              action={
                <Button variant="secondary" onClick={load}>
                  Try again
                </Button>
              }
            />
          </Card>
        ) : dashboard?.is_empty ? (
          <Card className="mt-6">
            <EmptyState
              icon="chart"
              title="No activity yet"
              message="Once schools onboard and start ordering, platform metrics appear here."
            />
          </Card>
        ) : (
          dashboard && (
            <>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Schools"
                  value={dashboard.schools.active + dashboard.schools.inactive}
                  icon="list"
                  hint={`${dashboard.schools.active} active, ${dashboard.schools.inactive} inactive`}
                />
                <StatCard
                  label="Active students"
                  value={dashboard.active_students.toLocaleString()}
                  icon="children"
                  hint={`across ${dashboard.schools.active} active schools`}
                />
                <StatCard
                  label="Total orders"
                  value={dashboard.total_orders.toLocaleString()}
                  icon="order"
                />
                <StatCard
                  label="Total revenue"
                  value={`$${dashboard.total_revenue}`}
                  icon="wallet"
                  iconTone="accent"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {(Object.keys(ROLE_LABEL) as Array<keyof PlatformDashboard['users_by_role']>).map(
                  (role) => (
                    <StatCard
                      key={role}
                      label={ROLE_LABEL[role]}
                      value={dashboard.users_by_role[role].toLocaleString()}
                      icon="user"
                    />
                  ),
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader title="Orders this week" subtitle="all schools" />
                  <div className="px-5 pb-5 pt-2">
                    <BarChart
                      series={[{ label: 'Orders', color: '#0F8A78' }]}
                      groups={dashboard.orders_this_week.map((d) => ({
                        label: d.day,
                        values: [d.count],
                      }))}
                    />
                  </div>
                </Card>

                <Card>
                  <CardHeader title="Top schools" subtitle="by order count" />
                  {dashboard.top_schools.length === 0 ? (
                    <div className="px-5 py-6 text-center text-sm text-muted">No orders yet.</div>
                  ) : (
                    <ul className="divide-y divide-line">
                      {dashboard.top_schools.map((s, i) => (
                        <li key={s.school_id} className="flex items-center gap-3 px-5 py-3">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand-deep">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-ink">{s.school_name}</div>
                            <div className="text-xs text-muted">{s.orders} orders</div>
                          </div>
                          <span className="ml-auto text-sm font-semibold text-ink">${s.revenue}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </>
          )
        )}
      </div>
    </AppShell>
  )
}
