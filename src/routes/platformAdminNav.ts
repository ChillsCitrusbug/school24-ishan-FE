import type { NavGroup, TabItem } from '@/components'

type PlatformAdminSection = 'schools' | 'users'

/**
 * Platform Admin sidebar/tab nav — ported structurally from the approved
 * design's school24-DESIGN/src/data/platform.ts (`paNav`/`paTabs`, which
 * itself takes an active-section key).
 *
 * Review finding (FR-011 round 1, Minor): every item now carries a real
 * `href` to its already-built route — `Sidebar`/`MobileTabBar` render
 * these via React Router's `Link` (client-side navigation, no full page
 * reload, so the in-memory-only JWT survives), not a plain `<a href>`.
 *
 * `active` defaults to `'schools'` so FR-006/007/008's existing callers
 * (which never passed an argument) keep their exact current highlighting
 * unchanged; FR-009's own Users screens pass `'users'`.
 */
export function platformAdminNavGroups(active: PlatformAdminSection = 'schools'): NavGroup[] {
  return [
    {
      items: [
        { icon: 'home', label: 'Dashboard', href: '/platform-admin' },
        { icon: 'list', label: 'Schools', active: active === 'schools', href: '/platform-admin/schools' },
        { icon: 'children', label: 'Users', active: active === 'users', href: '/platform-admin/users' },
      ],
    },
  ]
}

export function platformAdminTabs(active: PlatformAdminSection = 'schools'): TabItem[] {
  return [
    { icon: 'home', label: 'Dashboard', href: '/platform-admin' },
    { icon: 'list', label: 'Schools', active: active === 'schools', href: '/platform-admin/schools' },
    { icon: 'children', label: 'Users', active: active === 'users', href: '/platform-admin/users' },
  ]
}
