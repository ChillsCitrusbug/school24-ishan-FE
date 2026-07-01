import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from '../atoms/Icon'

/** Success / failure result header — for top-up results, order confirmations, etc. */
export function ResultHero({
  ok,
  title,
  message,
  children,
}: {
  ok: boolean
  title: string
  message?: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span
        className={cn(
          'grid h-16 w-16 place-items-center rounded-full',
          ok ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
        )}
      >
        <Icon name={ok ? 'check' : 'alert'} className="h-8 w-8" strokeWidth={2} />
      </span>
      <div>
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        {message && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{message}</p>}
      </div>
      {children}
    </div>
  )
}
