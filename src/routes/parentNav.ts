import type { NavGroup, TabItem } from '@/components'

export type ParentSection = 'home' | 'order' | 'children' | 'wallet' | 'restrictions' | 'insights'

/**
 * Parent sidebar/tab nav — ported structurally from the approved
 * design's school24-DESIGN/src/data/consumer.ts (`parentNav`/
 * `parentTabs`), matching the same "unset href stays inert" pattern
 * schoolAdminNav.ts/staffNav.ts/platformAdminNav.ts already established
 * — the one gap fixed here is that, unlike those three, NO nav-config
 * file existed for Parent at all (every Parent screen passed
 * `groups={[]}`), despite every route below already being real and
 * built. Every item maps to an already-built top-level route; deeper
 * sub-flows (add a child, top up, checkout, order detail, etc.) are
 * reached from within these screens, not from the nav itself — same
 * "one nav item per top-level module" discipline as every other role's
 * own nav config.
 */
export function parentNavGroups(active: ParentSection = 'home'): NavGroup[] {
  return [
    {
      label: 'Family',
      items: [
        { icon: 'home', label: 'Home', active: active === 'home', href: '/parent' },
        {
          icon: 'order',
          label: 'Order food',
          active: active === 'order',
          href: '/parent/select-child?next=/parent/menu',
        },
        {
          icon: 'children',
          label: 'My children',
          active: active === 'children',
          href: '/parent/children',
        },
      ],
    },
    {
      label: 'Money & control',
      items: [
        { icon: 'wallet', label: 'Wallet', active: active === 'wallet', href: '/parent/wallet' },
        {
          icon: 'shield',
          label: 'Restrictions',
          active: active === 'restrictions',
          href: '/parent/select-child?next=/parent/food-restrictions',
        },
        {
          icon: 'chart',
          label: 'Insights',
          active: active === 'insights',
          href: '/parent/spending-report',
        },
      ],
    },
  ]
}

export function parentTabs(active: ParentSection = 'home'): TabItem[] {
  return [
    { icon: 'home', label: 'Home', active: active === 'home', href: '/parent' },
    {
      icon: 'order',
      label: 'Order',
      active: active === 'order',
      href: '/parent/select-child?next=/parent/menu',
    },
    { icon: 'children', label: 'Children', active: active === 'children', href: '/parent/children' },
    { icon: 'wallet', label: 'Wallet', active: active === 'wallet', href: '/parent/wallet' },
    { icon: 'chart', label: 'Insights', active: active === 'insights', href: '/parent/spending-report' },
  ]
}
