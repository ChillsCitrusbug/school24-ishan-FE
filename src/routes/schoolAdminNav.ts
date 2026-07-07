import type { NavGroup, TabItem } from '@/components'

type SchoolAdminSection =
  | 'dashboard'
  | 'students'
  | 'classes'
  | 'staff'
  | 'approvals'
  | 'menu'
  | 'orders'
  | 'allOrders'
  | 'reports'
  | 'notifications'

/**
 * School Admin sidebar/tab nav — ported structurally from the approved
 * design's school24-DESIGN/src/data/school.ts (`saNav`/`saTabs`), which is
 * itself part of the approved design, not invented here. `href` is left
 * unset for modules not yet built (FR-012/015/016/024/020, etc.) — an
 * unset href stays an inert `<a href="#">` (Sidebar/MobileTabBar) rather
 * than linking to a route that doesn't exist yet.
 *
 * Review finding (FR-011 round 1, Minor): every item WITH an already-
 * built route now carries a real `href` — `Sidebar`/`MobileTabBar`
 * render these via React Router's `Link` (client-side navigation, no
 * full page reload, so the in-memory-only JWT survives), not a plain
 * `<a href>`.
 *
 * `active` defaults to `'dashboard'` so every existing caller (which
 * never passed an argument) keeps its exact current highlighting
 * unchanged; FR-011's own Classes screens pass `'classes'`.
 */
export function schoolAdminNavGroups(active: SchoolAdminSection = 'dashboard'): NavGroup[] {
  return [
    {
      label: 'School',
      items: [
        { icon: 'home', label: 'Dashboard', active: active === 'dashboard', href: '/school-admin' },
        { icon: 'children', label: 'Students', active: active === 'students', href: '/school-admin/students' },
        { icon: 'grid', label: 'Classes', active: active === 'classes', href: '/school-admin/classes' },
        { icon: 'user', label: 'Staff', active: active === 'staff', href: '/school-admin/staff' },
        {
          icon: 'check',
          label: 'Approvals',
          active: active === 'approvals',
          href: '/school-admin/approvals',
        },
      ],
    },
    {
      label: 'Canteen',
      items: [
        { icon: 'list', label: 'Menu', active: active === 'menu', href: '/school-admin/products' },
        { icon: 'order', label: 'Orders', active: active === 'orders', href: '/school-admin/orders' },
        {
          icon: 'order',
          label: 'All orders',
          active: active === 'allOrders',
          href: '/school-admin/orders/all',
        },
        {
          icon: 'chart',
          label: 'Reports',
          active: active === 'reports',
          href: '/school-admin/reports',
        },
      ],
    },
    {
      items: [
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

export function schoolAdminTabs(active: SchoolAdminSection = 'dashboard'): TabItem[] {
  return [
    { icon: 'home', label: 'Home', active: active === 'dashboard', href: '/school-admin' },
    { icon: 'children', label: 'Students', active: active === 'students', href: '/school-admin/students' },
    {
      icon: 'check',
      label: 'Approvals',
      active: active === 'approvals',
      href: '/school-admin/approvals',
    },
    { icon: 'order', label: 'Orders', active: active === 'orders', href: '/school-admin/orders' },
    { icon: 'chart', label: 'Reports', active: active === 'reports', href: '/school-admin/reports' },
  ]
}
