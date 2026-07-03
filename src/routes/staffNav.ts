import type { NavGroup, TabItem } from '@/components'

/**
 * Staff sidebar/tab nav — ported structurally from the approved
 * design's school24-DESIGN/src/data/staff.ts (`staffNav`/`staffTabs`),
 * matching the same "unset href stays inert" pattern as
 * schoolAdminNav.ts — Orders/Menu/Notifications don't have real screens
 * yet (FR-038/024/043), only Home (this ticket's own Staff Portal) does.
 *
 * Review finding (FR-011 round 1, Minor): Home now carries its real
 * `href` — `Sidebar`/`MobileTabBar` render it via React Router's `Link`
 * (client-side navigation, no full page reload, in-memory JWT survives).
 */
export function staffNavGroups(): NavGroup[] {
  return [
    {
      items: [
        { icon: 'home', label: 'Home', active: true, href: '/staff' },
        { icon: 'order', label: 'Orders' },
        { icon: 'list', label: 'Menu' },
        { icon: 'bell', label: 'Notifications' },
      ],
    },
  ]
}

export function staffTabs(): TabItem[] {
  return [
    { icon: 'home', label: 'Home', active: true, href: '/staff' },
    { icon: 'order', label: 'Orders' },
    { icon: 'list', label: 'Menu' },
    { icon: 'bell', label: 'Alerts' },
  ]
}
