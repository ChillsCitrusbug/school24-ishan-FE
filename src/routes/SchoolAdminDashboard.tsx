import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  Button,
  Card,
  EmptyState,
} from '@/components'
import { useAuth } from '@/features/auth/useAuth'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * SC-023 · School Admin Home / Dashboard (FR-001 — the one role home
 * screen this ticket owns; see EXECUTION_ORDER.md's "Remaining screens").
 *
 * Renders the approved component's "empty" state: FR-011/012/024/020
 * (classes, students, orders, approvals) aren't built yet, so there is
 * genuinely nothing to show in the stat cards — using the design's own
 * empty-state variant is accurate, not an invented UI state, and avoids
 * fabricating zero/placeholder counts. Switches to live data once those
 * tickets land (docs/design/field-reconciliation/FR-001.md).
 */
export function SchoolAdminDashboard() {
  const { user } = useAuth()

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
          right={<IconButton icon="bell" label="Notifications" />}
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

        <Card className="mt-6">
          <EmptyState
            icon="children"
            title="Let’s set up your school"
            message="Start by creating classes, then enrol students and invite canteen staff."
            action={<Button leadingIcon="plus">Create a class</Button>}
          />
        </Card>
      </div>
    </AppShell>
  )
}
