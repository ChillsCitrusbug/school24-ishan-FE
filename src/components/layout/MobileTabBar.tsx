import { cn } from '@/lib/cn'
import { Icon, type IconName } from '../atoms/Icon'

export interface TabItem {
  icon: IconName
  label: string
  active?: boolean
  href?: string
}

/** Bottom tab bar — mobile (<768px) only. The locked mobile nav pattern; never a top nav. Max 5 tabs. */
export function MobileTabBar({ items }: { items: TabItem[] }) {
  return (
    <nav
      className="grid border-t border-line bg-white md:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <a
          key={item.label}
          href={item.href ?? '#'}
          aria-current={item.active ? 'page' : undefined}
          className={cn(
            'flex h-16 flex-col items-center justify-center gap-1 text-[10px]',
            item.active ? 'font-semibold text-brand-deep' : 'text-muted',
          )}
        >
          <Icon name={item.icon} strokeWidth={item.active ? 1.9 : 1.6} />
          {item.label}
        </a>
      ))}
    </nav>
  )
}
