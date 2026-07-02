import { EmailRoleProfileScreen } from './EmailRoleProfileScreen'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'

/** Sc097SaProfile.tsx — School Admin (FR-048). */
export function SaProfileScreen() {
  return (
    <EmailRoleProfileScreen
      roleLabel="School Admin"
      backLabel="Dashboard"
      backHref="/school-admin"
      navGroups={schoolAdminNavGroups()}
      tabs={schoolAdminTabs()}
      notificationLabels={['New link approvals', 'Daily order summary', 'System updates']}
    />
  )
}
