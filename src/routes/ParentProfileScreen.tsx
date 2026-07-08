import { EmailRoleProfileScreen } from './EmailRoleProfileScreen'
import { parentNavGroups, parentTabs } from './parentNav'

/** Sc069ParentProfile.tsx — Parent (FR-048). */
export function ParentProfileScreen() {
  return (
    <EmailRoleProfileScreen
      roleLabel="Parent"
      backLabel="Home"
      backHref="/parent"
      navGroups={parentNavGroups()}
      tabs={parentTabs()}
      notificationLabels={['Order updates', 'Low-balance alerts', 'School announcements']}
    />
  )
}
