import { Outlet } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { MobileTabBar } from '@/components/layout/MobileTabBar'

/**
 * Authenticated app shell wiring (INFRA-000).
 *
 * Composes the shared design-system shell (Sidebar + Topbar + MobileTabBar
 * inside AppShell) so the Tailwind theme is proven to apply end-to-end.
 * Nav content is intentionally empty/placeholder — real per-role nav
 * groups/tabs belong to each role's own dashboard ticket (e.g. FR-001's
 * SC-023, FR-018's SC-041 staff portal), per this ticket's own
 * out-of-scope note: "No UI screens beyond the shell."
 */
export function AppLayout() {
  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={[]}
          user={{ initials: '—', name: '—', role: '—' }}
        />
      }
      topbar={<Topbar />}
      mobileNav={<MobileTabBar items={[]} />}
    >
      <Outlet />
    </AppShell>
  )
}
