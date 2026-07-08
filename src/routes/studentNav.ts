import type { NavGroup, TabItem } from '@/components'

export type StudentSection = 'home' | 'menu' | 'orders' | 'wallet'

/**
 * Student sidebar/tab nav — ported structurally from the approved
 * design's school24-DESIGN/src/data/consumer.ts (`studentNav`/
 * `studentTabs`), matching the same "unset href stays inert" pattern
 * schoolAdminNav.ts/staffNav.ts/platformAdminNav.ts already established
 * — the one gap fixed here is that, unlike those three, NO nav-config
 * file existed for Student at all (every Student screen passed
 * `groups={[]}`), despite every route below already being real and
 * built. Every item maps to an already-built top-level route.
 */
export function studentNavGroups(active: StudentSection = 'home'): NavGroup[] {
  return [
    {
      items: [
        { icon: 'home', label: 'Home', active: active === 'home', href: '/student' },
        { icon: 'order', label: 'Menu', active: active === 'menu', href: '/student/menu' },
        { icon: 'clock', label: 'My orders', active: active === 'orders', href: '/student/orders' },
        { icon: 'wallet', label: 'Wallet', active: active === 'wallet', href: '/student/wallet' },
      ],
    },
  ]
}

export function studentTabs(active: StudentSection = 'home'): TabItem[] {
  return [
    { icon: 'home', label: 'Home', active: active === 'home', href: '/student' },
    { icon: 'order', label: 'Menu', active: active === 'menu', href: '/student/menu' },
    { icon: 'clock', label: 'Orders', active: active === 'orders', href: '/student/orders' },
    { icon: 'wallet', label: 'Wallet', active: active === 'wallet', href: '/student/wallet' },
  ]
}
