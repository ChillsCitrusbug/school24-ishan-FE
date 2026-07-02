import { EmailRoleProfileScreen } from './EmailRoleProfileScreen'

/**
 * Sc069ParentProfile.tsx — Parent (FR-048).
 *
 * No `parentNav.ts` exists yet (Parent's own real dashboard, FR-046, is
 * a later ticket) — empty nav groups, same precedent as
 * `PlaceholderDashboard.tsx`'s own Parent rendering.
 */
export function ParentProfileScreen() {
  return (
    <EmailRoleProfileScreen
      roleLabel="Parent"
      backLabel="Home"
      backHref="/parent"
      navGroups={[]}
      tabs={[]}
      notificationLabels={['Order updates', 'Low-balance alerts', 'School announcements']}
    />
  )
}
