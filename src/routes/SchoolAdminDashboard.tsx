import { useCallback, useEffect, useRef, useState } from 'react'
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
  StatCard,
  EmptyState,
  ErrorState,
  Avatar,
  Icon,
  Spinner,
  type IconName,
} from '@/components'
import { useAuth } from '@/features/auth/useAuth'
import { getSchoolDashboard, type SchoolDashboard } from '@/features/analytics/api'
import { extractErrorMessage } from '@/lib/api-error'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

interface QuickAction {
  icon: IconName
  label: string
  desc: string
  href: string
}

const ACTIONS: QuickAction[] = [
  { icon: 'children', label: 'Add student', desc: 'Enrol a new student', href: '/school-admin/students/new' },
  { icon: 'grid', label: 'Manage classes', desc: 'Create and edit classes', href: '/school-admin/classes' },
  { icon: 'order', label: 'View orders', desc: 'Today’s canteen orders', href: '/school-admin/orders' },
  { icon: 'bell', label: 'Send notification', desc: 'Message families', href: '/school-admin/notifications/new' },
]

/**
 * SC-023 · School Admin Home / Dashboard (FR-001, live-data pass
 * 2026-07-08). Direct user bug report: this screen had permanently
 * shipped the mock's own `empty` EmptyState variant (a dead "Create a
 * class" button with no destination) instead of switching to the
 * mock's own `default` layout once classes/students/orders/approvals
 * actually shipped, as the original FR-001 doc comment had promised.
 * Now calls the real `GET /api/v1/analytics/school-dashboard`
 * (mirrors `PlatformDashboardScreen.tsx`'s own "one dedicated
 * aggregation endpoint" pattern) and renders the mock's own `default`
 * state: 4 StatCards, a Quick actions grid (each tile a real link into
 * its own module), and a "Needs attention" card for the single most
 * recent pending approval. `is_empty` (zero classes at all — a
 * genuine first-run school) is the only case that still shows the
 * mock's own `empty` variant, now with a REAL "Create a class" link.
 */
export function SchoolAdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<SchoolDashboard | null>(null)
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
    getSchoolDashboard()
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
          brandSubtitle={user?.school_name ?? undefined}
          groups={schoolAdminNavGroups()}
          user={{
            initials: user ? initialsOf(user.full_name) : '',
            name: user?.full_name ?? '',
            role: 'School Admin',
          }}
        />
      }
      topbar={
        <Topbar
          searchPlaceholder="Search students, classes…"
          right={<IconButton icon="bell" label="Notifications" onClick={() => navigate('/school-admin/notifications')} />}
        />
      }
      mobileNav={<MobileTabBar items={schoolAdminTabs()} />}
    >
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-ink">
          Good morning{user ? `, ${user.full_name.split(' ')[0]}` : ''} 👋
        </h1>
        <p className="mt-0.5 text-sm text-muted">
          {user?.school_name ?? 'Your school'} · here’s your school today.
        </p>

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
              icon="children"
              title="Let’s set up your school"
              message="Start by creating classes, then enrol students and invite canteen staff."
              action={
                <Button leadingIcon="plus" onClick={() => navigate('/school-admin/classes/new')}>
                  Create a class
                </Button>
              }
            />
          </Card>
        ) : (
          dashboard && (
            <>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Students"
                  value={dashboard.students_count.toLocaleString()}
                  icon="children"
                  hint={`across ${dashboard.classes_count} ${dashboard.classes_count === 1 ? 'class' : 'classes'}`}
                />
                <StatCard label="Classes" value={dashboard.classes_count.toLocaleString()} icon="grid" />
                <StatCard
                  label="Orders today"
                  value={dashboard.orders_today_count.toLocaleString()}
                  icon="order"
                  hint={`$${dashboard.orders_today_value} in sales`}
                />
                <StatCard
                  label="Approvals"
                  value={dashboard.pending_approvals_count > 0 ? `${dashboard.pending_approvals_count} pending` : 'None pending'}
                  icon="check"
                  iconTone={dashboard.pending_approvals_count > 0 ? 'accent' : 'brand'}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <h2 className="mb-3 text-lg font-bold text-ink">Quick actions</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {ACTIONS.map((a) => (
                      <button
                        key={a.label}
                        onClick={() => navigate(a.href)}
                        className="group flex items-center gap-3 rounded-card border border-line bg-white p-4 text-left shadow-softer transition hover:border-brand/40 hover:shadow-soft"
                      >
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-card bg-brand/10 text-brand">
                          <Icon name={a.icon} />
                        </span>
                        <div>
                          <div className="font-semibold text-ink group-hover:text-brand-deep">{a.label}</div>
                          <div className="text-xs text-muted">{a.desc}</div>
                        </div>
                        <Icon name="arrowRight" className="ml-auto h-4 w-4 text-muted" strokeWidth={2} />
                      </button>
                    ))}
                  </div>
                </div>

                <Card>
                  <CardHeader
                    title="Needs attention"
                    subtitle={
                      dashboard.pending_approvals_count > 0
                        ? `${dashboard.pending_approvals_count} pending approval${dashboard.pending_approvals_count === 1 ? '' : 's'}`
                        : 'All caught up'
                    }
                    className="border-b border-line"
                  />
                  {dashboard.most_recent_pending_approval ? (
                    <div className="flex items-center gap-3 px-5 py-4">
                      <Avatar initials={initialsOf(dashboard.most_recent_pending_approval.parent_name)} tone="brand" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-ink">
                          {dashboard.most_recent_pending_approval.parent_name}
                        </div>
                        <div className="text-xs text-muted">
                          link request · {dashboard.most_recent_pending_approval.student_name}
                        </div>
                      </div>
                      <Button size="sm" className="ml-auto" onClick={() => navigate('/school-admin/approvals')}>
                        Review
                      </Button>
                    </div>
                  ) : (
                    <div className="px-5 py-6 text-center text-sm text-muted">No pending approvals.</div>
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
