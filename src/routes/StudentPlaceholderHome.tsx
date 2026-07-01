import { AppShell, Sidebar, Topbar, MobileTabBar, Card, EmptyState } from '@/components'
import { useStudentAuth } from '@/features/student-auth/useStudentAuth'

/**
 * Generic authenticated landing for students (FR-002) — the real "school
 * canteen home" (SC-070, `Sc070StudentHome.tsx`) belongs to FR-047
 * (depends on FR-035/FR-041/FR-033, none built yet). Same pattern as
 * FR-001's PlaceholderDashboard for the 3 roles without a real dashboard
 * yet — see docs/design/field-reconciliation/FR-002.md item 2.
 */
export function StudentPlaceholderHome() {
  const { student } = useStudentAuth()

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={[]}
          user={{ initials: '', name: student?.full_name ?? '', role: 'Student' }}
        />
      }
      topbar={<Topbar />}
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-6xl">
        <Card>
          <EmptyState
            icon="clock"
            title="Canteen home coming soon"
            message="Menu browsing and ordering are being built. You're signed in — this is just a placeholder home."
          />
        </Card>
      </div>
    </AppShell>
  )
}
