import type { NavGroup, TabItem } from '@/components'

/**
 * Platform Admin sidebar/tab nav — ported structurally from the approved
 * design's school24-DESIGN/src/data/platform.ts (`paNav`/`paTabs`).
 * `href` is left unset (Sidebar renders a raw `<a>` with no client-side
 * routing support — a real href would trigger a full page reload and
 * wipe the in-memory-only JWT, same precedent as schoolAdminNav.ts) for
 * every item, including "Schools" — navigation between the schools list
 * and the onboarding form happens via buttons (`useNavigate`), not the
 * sidebar, matching FR-017/018's own established pattern.
 */
export function platformAdminNavGroups(): NavGroup[] {
  return [
    {
      items: [
        { icon: 'home', label: 'Dashboard' },
        { icon: 'list', label: 'Schools', active: true },
        { icon: 'children', label: 'Users' },
      ],
    },
  ]
}

export function platformAdminTabs(): TabItem[] {
  return [
    { icon: 'home', label: 'Dashboard' },
    { icon: 'list', label: 'Schools', active: true },
    { icon: 'children', label: 'Users' },
  ]
}
