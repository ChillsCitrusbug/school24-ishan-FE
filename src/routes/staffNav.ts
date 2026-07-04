import type { NavGroup, TabItem } from '@/components'

type StaffSection = 'home' | 'menu'

/**
 * Staff sidebar/tab nav — ported structurally from the approved
 * design's school24-DESIGN/src/data/staff.ts (`staffNav`/`staffTabs`),
 * matching the same "unset href stays inert" pattern as
 * schoolAdminNav.ts — Orders/Notifications don't have real screens yet
 * (FR-038/043); Home (FR-018) and now Menu (FR-024) do.
 *
 * Review finding (FR-011 round 1, Minor): every item WITH a real route
 * carries its own `href` — `Sidebar`/`MobileTabBar` render these via
 * React Router's `Link` (client-side navigation, no full page reload,
 * in-memory JWT survives).
 *
 * `active` defaults to `'home'` so every existing caller (which never
 * passed an argument) keeps its exact current highlighting unchanged;
 * FR-024's own Products screens pass `'menu'`.
 */
export function staffNavGroups(active: StaffSection = 'home'): NavGroup[] {
  return [
    {
      items: [
        { icon: 'home', label: 'Home', active: active === 'home', href: '/staff' },
        { icon: 'order', label: 'Orders' },
        {
          icon: 'list',
          label: 'Menu',
          active: active === 'menu',
          href: '/school-admin/products',
        },
        { icon: 'bell', label: 'Notifications' },
      ],
    },
  ]
}

export function staffTabs(active: StaffSection = 'home'): TabItem[] {
  return [
    { icon: 'home', label: 'Home', active: active === 'home', href: '/staff' },
    { icon: 'order', label: 'Orders' },
    {
      icon: 'list',
      label: 'Menu',
      active: active === 'menu',
      href: '/school-admin/products',
    },
    { icon: 'bell', label: 'Alerts' },
  ]
}
