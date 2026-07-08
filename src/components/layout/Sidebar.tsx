import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from '../atoms/Icon'
import { Avatar } from '../atoms/Avatar'
import { useAuth } from '@/features/auth/useAuth'
import { useStudentAuth } from '@/features/student-auth/useStudentAuth'
import { ROLE_HOME_PATH, ROLE_PROFILE_PATH } from '@/routes/roleHome'
import { getSidebarCollapsed, setSidebarCollapsed } from '@/lib/sidebar-collapse'

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
  // Clickable-brand addition (2026-07-08): always navigates back to the
  // signed-in identity's own home, regardless of which screen is
  // currently open — resolved from whichever auth context is active,
  // same self-sufficient pattern as Topbar's own Logout button.
  const { user: authUser } = useAuth()
  const { student } = useStudentAuth()
  const homeHref = student ? '/student' : authUser ? ROLE_HOME_PATH[authUser.role] : '/'
  // Account-menu addition (2026-07-08, direct user bug report — "you
  // are showing 3 dots button, but it isn't doing anything"): every
  // role's own profile screen already existed and worked, just had no
  // entry point from this button. Same self-sufficient auth-context
  // resolution as homeHref above.
  const navigate = useNavigate()
  const profileHref = student ? '/student/profile' : authUser ? ROLE_PROFILE_PATH[authUser.role] : null

  // Collapse addition (2026-07-08): no calendar-grid-style precedent
  // exists for this in either the design source of truth or the real
  // app (confirmed — neither has a collapse affordance today), so this
  // is new UI built directly for the request rather than ported from
  // an approved mock, same judgment call as DateRangeButton.tsx.
  // Persisted per-browser via localStorage (a layout preference, not
  // session data) so it survives navigation and a refresh.
  const [collapsed, setCollapsed] = useState(getSidebarCollapsed)

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      setSidebarCollapsed(next)
      return next
    })
  }

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-line bg-white transition-[width] duration-150 md:flex',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className={cn('flex h-16 items-center border-b border-line', collapsed ? 'justify-center px-2' : 'gap-2.5 px-5')}>
        <Link to={homeHref} className={cn('flex min-w-0 items-center', collapsed ? '' : 'gap-2.5')}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-card bg-brand text-white">
            <Icon name="logo" />
          </span>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <div className="truncate font-bold text-ink">{brandTitle}</div>
              {brandSubtitle && <div className="truncate text-[11px] text-muted">{brandSubtitle}</div>}
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-control text-muted hover:bg-canvas hover:text-ink"
          >
            <Icon name="chevronLeft" className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className="mx-auto mt-2 grid h-7 w-7 shrink-0 place-items-center rounded-control text-muted hover:bg-canvas hover:text-ink"
        >
          <Icon name="chevronRight" className="h-4 w-4" />
        </button>
      )}

      <nav className="flex-1 overflow-y-auto p-3 text-sm">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label && !collapsed && (
              <div className="px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted first:pt-2">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const className = cn(
                'relative flex items-center rounded-control py-2 transition',
                collapsed ? 'justify-center px-2' : 'gap-3 px-3',
                item.active
                  ? 'bg-brand/8 font-semibold text-brand-deep'
                  : 'text-muted hover:bg-canvas hover:text-ink',
              )
              const content = (
                <>
                  {item.active && !collapsed && (
                    <span className="absolute bottom-1.5 left-0 top-1.5 w-1 rounded-full bg-brand" />
                  )}
                  <Icon name={item.icon} strokeWidth={item.active ? 1.8 : 1.6} className="shrink-0" />
                  {!collapsed && item.label}
                </>
              )
              // A real `href` uses client-side routing (Link) so the
              // in-memory-only JWT survives navigation — a plain `<a
              // href>` triggers a full page reload and signs the user
              // out (same reasoning documented in api/client.ts). An
              // item with no route built yet stays an inert `href="#"`.
              return item.href ? (
                <Link
                  key={item.label}
                  to={item.href}
                  aria-current={item.active ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  className={className}
                >
                  {content}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href="#"
                  aria-current={item.active ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  className={className}
                >
                  {content}
                </a>
              )
            })}
          </div>
        ))}
      </nav>

      <div className={cn('flex items-center border-t border-line p-3', collapsed ? 'justify-center' : 'gap-3')}>
        <Avatar initials={user.initials} tone="brand" />
        {!collapsed && (
          <>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold text-ink">{user.name}</div>
              <div className="text-xs text-muted">{user.role}</div>
            </div>
            <button
              type="button"
              onClick={() => profileHref && navigate(profileHref)}
              className="ml-auto text-muted hover:text-ink"
              aria-label="View profile"
              title="View profile"
            >
              <Icon name="dots" />
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
