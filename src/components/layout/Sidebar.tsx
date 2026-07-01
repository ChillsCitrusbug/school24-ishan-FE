import { cn } from '@/lib/cn'
import { Icon, type IconName } from '../atoms/Icon'
import { Avatar } from '../atoms/Avatar'

export interface NavItem {
  icon: IconName
  label: string
  active?: boolean
  href?: string
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

export interface SidebarUser {
  initials: string
  name: string
  role: string
}

/** Left sidebar — desktop/tablet (≥768px). Hidden on mobile (bottom tabs take over). Max 7 top-level items, no nesting. */
export function Sidebar({
  brandTitle,
  brandSubtitle,
  groups,
  user,
}: {
  brandTitle: string
  brandSubtitle?: string
  groups: NavGroup[]
  user: SidebarUser
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-white md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-line px-5">
        <span className="grid h-9 w-9 place-items-center rounded-card bg-brand text-white">
          <Icon name="logo" />
        </span>
        <div className="leading-tight">
          <div className="font-bold text-ink">{brandTitle}</div>
          {brandSubtitle && <div className="text-[11px] text-muted">{brandSubtitle}</div>}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 text-sm">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div className="px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted first:pt-2">
                {group.label}
              </div>
            )}
            {group.items.map((item) => (
              <a
                key={item.label}
                href={item.href ?? '#'}
                aria-current={item.active ? 'page' : undefined}
                className={cn(
                  'relative flex items-center gap-3 rounded-control px-3 py-2 transition',
                  item.active
                    ? 'bg-brand/8 font-semibold text-brand-deep'
                    : 'text-muted hover:bg-canvas hover:text-ink',
                )}
              >
                {item.active && <span className="absolute bottom-1.5 left-0 top-1.5 w-1 rounded-full bg-brand" />}
                <Icon name={item.icon} strokeWidth={item.active ? 1.8 : 1.6} />
                {item.label}
              </a>
            ))}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t border-line p-3">
        <Avatar initials={user.initials} tone="brand" />
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold text-ink">{user.name}</div>
          <div className="text-xs text-muted">{user.role}</div>
        </div>
        <button className="ml-auto text-muted hover:text-ink" aria-label="Account menu">
          <Icon name="dots" />
        </button>
      </div>
    </aside>
  )
}
