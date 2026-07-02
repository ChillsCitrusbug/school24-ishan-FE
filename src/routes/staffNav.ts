import type { NavGroup, TabItem } from '@/components'

/**
 * Staff sidebar/tab nav — ported structurally from the approved
 * design's school24-DESIGN/src/data/staff.ts (`staffNav`/`staffTabs`),
 * matching the same "unset href safely no-ops" pattern as
 * schoolAdminNav.ts — Orders/Menu/Notifications don't have real screens
 * yet (FR-038/024/043), only Home (this ticket's own Staff Portal) does.
 */
export function staffNavGroups(): NavGroup[] {
  return [
    {
      items: [
        { icon: 'home', label: 'Home', active: true },
        { icon: 'order', label: 'Orders' },
        { icon: 'list', label: 'Menu' },
        { icon: 'bell', label: 'Notifications' },
      ],
    },
  ]
}

export function staffTabs(): TabItem[] {
  return [
    { icon: 'home', label: 'Home', active: true },
    { icon: 'order', label: 'Orders' },
    { icon: 'list', label: 'Menu' },
    { icon: 'bell', label: 'Alerts' },
  ]
}
