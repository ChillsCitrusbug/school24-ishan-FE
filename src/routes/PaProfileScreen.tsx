import { EmailRoleProfileScreen } from './EmailRoleProfileScreen'
import { platformAdminNavGroups, platformAdminTabs } from './platformAdminNav'

/** Sc022PaProfile.tsx — Platform Admin (FR-048). */
export function PaProfileScreen() {
  return (
    <EmailRoleProfileScreen
      roleLabel="Platform Admin"
      backLabel="Dashboard"
      backHref="/platform-admin"
      navGroups={platformAdminNavGroups()}
      tabs={platformAdminTabs()}
      notificationLabels={['New school onboarded', 'Incident alerts', 'Weekly digest']}
    />
  )
}
