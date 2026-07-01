import type { ReactNode } from 'react'
import { Input } from '../molecules/Input'

/** Top app bar — search + a right-aligned action slot. No navigation lives here (nav = sidebar / bottom tabs). */
export function Topbar({
  searchPlaceholder = 'Search…',
  right,
}: {
  searchPlaceholder?: string
  right?: ReactNode
}) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white px-4 sm:gap-4 sm:px-6">
      <Input leadingIcon="search" placeholder={searchPlaceholder} className="max-w-md flex-1" aria-label="Search" />
      <div className="ml-auto flex items-center gap-2 sm:gap-3">{right}</div>
    </header>
  )
}
