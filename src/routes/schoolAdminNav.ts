import type { NavGroup, TabItem } from '@/components'

/**
 * School Admin sidebar/tab nav — ported structurally from the approved
 * design's school24-DESIGN/src/data/school.ts (`saNav`/`saTabs`), which is
 * itself part of the approved design, not invented here. `href` is left
 * unset for modules not yet built (FR-011/012/024/020, etc.) — an unset
 * href safely no-ops (Sidebar/MobileTabBar default to `#`) rather than
 * linking to a route that doesn't exist yet.
 */
export function schoolAdminNavGroups(): NavGroup[] {
  return [
    {
      label: 'School',
      items: [
        { icon: 'home', label: 'Dashboard', active: true },
        { icon: 'children', label: 'Students' },
        { icon: 'grid', label: 'Classes' },
        { icon: 'user', label: 'Staff' },
        { icon: 'check', label: 'Approvals' },
      ],
    },
    {
      label: 'Canteen',
      items: [
        { icon: 'list', label: 'Menu' },
        { icon: 'order', label: 'Orders' },
        { icon: 'chart', label: 'Reports' },
      ],
    },
    {
      items: [{ icon: 'bell', label: 'Notifications' }],
    },
  ]
}

export function schoolAdminTabs(): TabItem[] {
  return [
    { icon: 'home', label: 'Home', active: true },
    { icon: 'children', label: 'Students' },
    { icon: 'check', label: 'Approvals' },
    { icon: 'order', label: 'Orders' },
    { icon: 'chart', label: 'Reports' },
  ]
}
