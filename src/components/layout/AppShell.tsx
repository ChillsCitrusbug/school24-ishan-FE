import type { ReactNode } from 'react'

/**
 * App frame: sidebar (desktop/tablet) + top bar + scrolling content + bottom tabs (mobile).
 * Each nav piece carries its own responsive visibility, so the shell just slots them.
 */
export function AppShell({
  sidebar,
  topbar,
  mobileNav,
  children,
}: {
  sidebar?: ReactNode
  topbar?: ReactNode
  mobileNav?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        {topbar}
        <main className="flex-1 overflow-y-auto p-4 pb-20 sm:p-6 md:pb-6">{children}</main>
        {mobileNav}
      </div>
    </div>
  )
}
