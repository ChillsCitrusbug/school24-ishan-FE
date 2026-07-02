import { EmailRoleProfileScreen } from './EmailRoleProfileScreen'
import { staffNavGroups, staffTabs } from './staffNav'

/**
 * Sc042StaffProfile.tsx — Staff (FR-048).
 *
 * The approved mock shows a decorative "Staff ID" row (e.g.
 * "GV-STAFF-014") — `staff_profiles` has no such human-readable
 * identifier column at all (only `position`/`department`/
 * `assigned_role_id`), unlike `students.student_id`, which is a real
 * field. Not fabricated: this InfoRow is omitted rather than shown with
 * invented data.
 */
export function StaffProfileScreen() {
  return (
    <EmailRoleProfileScreen
      roleLabel="Staff"
      backLabel="Home"
      backHref="/staff"
      navGroups={staffNavGroups()}
      tabs={staffTabs()}
      notificationLabels={['New order alerts', 'Daily summary email', 'School announcements']}
    />
  )
}
