import type { IconName } from '@/components'
import type { ModulePermission, PermissionModuleValue } from '@/features/roles/api'

/**
 * The fixed 4x4 module × operation set (FR-017's ticket text, the
 * `permission_module` DB enum, and the Gherkin's own Examples tables are
 * unanimous on these — the design repo's own `staffroles.ts` mock data
 * has a different 5-module placeholder set including "Reports", which
 * doesn't exist anywhere else; the approved screens' structure is
 * reused, this real 4x4 set is not (see
 * docs/design/field-reconciliation/FR-017.md item 1).
 */
export const MODULES: { value: PermissionModuleValue; label: string }[] = [
  { value: 'approval', label: 'Approval' },
  { value: 'order_management', label: 'Order Management' },
  { value: 'menu_management', label: 'Menu Management' },
  { value: 'notification', label: 'Notification' },
]

/** Column order matches the approved Sc038RoleBuilder.tsx design exactly
 * (Listing, Add, Edit, Delete) — a display-order choice only, independent
 * of the API's own field names. */
export const OPERATIONS: { key: keyof Omit<ModulePermission, 'module'>; label: string }[] = [
  { key: 'can_list', label: 'Listing' },
  { key: 'can_add', label: 'Add' },
  { key: 'can_edit', label: 'Edit' },
  { key: 'can_delete', label: 'Delete' },
]

/**
 * SC-041 (Staff Portal) module cards — icon/label/description per
 * module. The design mock's own list (`school24-DESIGN/src/data/staff.ts`)
 * has a different 4-module set (includes a fake "Reports", omits
 * "Approval") — the real 4x4 set is used here instead, same resolution
 * as the MODULES constant above (see
 * docs/design/field-reconciliation/FR-018.md item 7). No `badge` field
 * (e.g. live order counts) — no real data source exists yet (orders
 * aren't built), omitted rather than fabricated.
 */
export const STAFF_MODULES: {
  module: PermissionModuleValue
  icon: IconName
  label: string
  desc: string
}[] = [
  {
    module: 'order_management',
    icon: 'order',
    label: 'Order fulfilment',
    desc: 'Work the live order queue and advance statuses.',
  },
  {
    module: 'menu_management',
    icon: 'list',
    label: 'Menu management',
    desc: 'Add products and combos, set availability.',
  },
  {
    module: 'notification',
    icon: 'bell',
    label: 'Notifications',
    desc: 'Send updates to families and staff.',
  },
  {
    module: 'approval',
    icon: 'check',
    label: 'Approvals',
    desc: 'Review and approve parent-student link requests.',
  },
]

export function summarizePermissions(permissions: ModulePermission[]): string {
  const granted = MODULES.filter((m) => {
    const p = permissions.find((perm) => perm.module === m.value)
    return p && (p.can_add || p.can_edit || p.can_delete || p.can_list)
  }).map((m) => m.label)

  return granted.length > 0 ? granted.join(' · ') : 'No permissions granted'
}
