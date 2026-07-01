import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from '../atoms/Icon'

/** Empty / first-run state — friendly icon, title, guidance, and an optional primary action. */
export function EmptyState({
  icon = 'order',
  title,
  message,
  action,
  className,
}: {
  icon?: IconName
  title: string
  message?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}>
      <span className="grid h-14 w-14 place-items-center rounded-full bg-mint text-brand">
        <Icon name={icon} className="h-7 w-7" />
      </span>
      <div>
        <h3 className="font-semibold text-ink">{title}</h3>
        {message && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{message}</p>}
      </div>
      {action}
    </div>
  )
}
