import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from '../atoms/Icon'

/** Error state — for failed loads. Pair with a retry action. */
export function ErrorState({
  title = 'Something went wrong',
  message = 'We couldn’t load this just now. Please try again.',
  action,
  className,
}: {
  title?: string
  message?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}>
      <span className="grid h-14 w-14 place-items-center rounded-full bg-danger-soft text-danger">
        <Icon name="alert" className="h-7 w-7" />
      </span>
      <div>
        <h3 className="font-semibold text-ink">{title}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{message}</p>
      </div>
      {action}
    </div>
  )
}
