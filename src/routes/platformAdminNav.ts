import type { NavGroup, TabItem } from '@/components'

type PlatformAdminSection = 'schools' | 'users'

/**
 * Platform Admin sidebar/tab nav — ported structurally from the approved
 * design's school24-DESIGN/src/data/platform.ts (`paNav`/`paTabs`, which
 * itself takes an active-section key). `href` is left unset (Sidebar
 * renders a raw `<a>` with no client-side routing support — a real href
 * would trigger a full page reload and wipe the in-memory-only JWT, same
 * precedent as schoolAdminNav.ts) for every item — navigation happens via
 * buttons (`useNavigate`), not the sidebar, matching FR-017/018's own
 * established pattern.
 *
 * `active` defaults to `'schools'` so FR-006/007/008's existing callers
 * (which never passed an argument) keep their exact current highlighting
 * unchanged; FR-009's own Users screens pass `'users'`.
 */
export function platformAdminNavGroups(active: PlatformAdminSection = 'schools'): NavGroup[] {
  return [
    {
      items: [
        { icon: 'home', label: 'Dashboard' },
        { icon: 'list', label: 'Schools', active: active === 'schools' },
        { icon: 'children', label: 'Users', active: active === 'users' },
      ],
    },
  ]
}

export function platformAdminTabs(active: PlatformAdminSection = 'schools'): TabItem[] {
  return [
    { icon: 'home', label: 'Dashboard' },
    { icon: 'list', label: 'Schools', active: active === 'schools' },
    { icon: 'children', label: 'Users', active: active === 'users' },
  ]
}
