import type { NavGroup, TabItem } from '@/components'

type StaffSection = 'home' | 'menu' | 'approvals' | 'orders' | 'notifications'

/**
 * Staff sidebar/tab nav — ported structurally from the approved
 * design's school24-DESIGN/src/data/staff.ts (`staffNav`/`staffTabs`),
 * matching the same "unset href stays inert" pattern as
 * schoolAdminNav.ts. Home (FR-018), Menu (FR-024), Approvals (FR-020),
 * Orders (FR-038 — the shared `/school-admin/orders` route, same
 * one-route-reused-by-both-roles precedent Menu/Approvals already
 * established), and Notifications (FR-043/052) all now have real
 * screens.
 *
 * Review finding (FR-011 round 1, Minor): every item WITH a real route
 * carries its own `href` — `Sidebar`/`MobileTabBar` render these via
 * React Router's `Link` (client-side navigation, no full page reload,
 * in-memory JWT survives).
 *
 * `active` defaults to `'home'` so every existing caller (which never
 * passed an argument) keeps its exact current highlighting unchanged;
 * FR-024's own Products screens pass `'menu'`.
 *
 * FR-020 adds `'approvals'` — no staff-specific approved mock exists
 * for this nav (Sc043/044's own Design reference names only
 * `saNav`/`saTabs`), so this reuses the same shared
 * `/school-admin/approvals` route Staff-with-access already reaches
 * server-side, matching Menu's own precedent of one shared route
 * reused across both roles. FR-052 wires the mobile tab's own
 * "Alerts" item to the same shared `/school-admin/notifications` log
 * route, previously inert.
 */
export function staffNavGroups(active: StaffSection = 'home'): NavGroup[] {
  return [
    {
      items: [
        { icon: 'home', label: 'Home', active: active === 'home', href: '/staff' },
        { icon: 'order', label: 'Orders', active: active === 'orders', href: '/school-admin/orders' },
        {
          icon: 'list',
          label: 'Menu',
          active: active === 'menu',
          href: '/school-admin/products',
        },
        {
          icon: 'check',
          label: 'Approvals',
          active: active === 'approvals',
          href: '/school-admin/approvals',
        },
        {
          icon: 'bell',
          label: 'Notifications',
          active: active === 'notifications',
          href: '/school-admin/notifications',
        },
      ],
    },
  ]
}

export function staffTabs(active: StaffSection = 'home'): TabItem[] {
  return [
    { icon: 'home', label: 'Home', active: active === 'home', href: '/staff' },
    { icon: 'order', label: 'Orders', active: active === 'orders', href: '/school-admin/orders' },
    {
      icon: 'list',
      label: 'Menu',
      active: active === 'menu',
      href: '/school-admin/products',
    },
    {
      icon: 'check',
      label: 'Approvals',
      active: active === 'approvals',
      href: '/school-admin/approvals',
    },
    {
      icon: 'bell',
      label: 'Alerts',
      active: active === 'notifications',
      href: '/school-admin/notifications',
    },
  ]
}
