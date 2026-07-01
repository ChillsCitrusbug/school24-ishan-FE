import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from '../atoms/Icon'

/** Centered system / error page (404, 500, maintenance, session, blocked). */
export function SystemPage({
  code,
  icon,
  tone = 'brand',
  title,
  message,
  actions,
}: {
  code?: string
  icon?: IconName
  tone?: 'brand' | 'danger' | 'warning'
  title: string
  message: string
  actions?: ReactNode
}) {
  const iconTone = {
    brand: 'bg-mint text-brand',
    danger: 'bg-danger-soft text-danger',
    warning: 'bg-warning-soft text-warning',
  }[tone]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas p-6 text-center">
      <div className="w-full max-w-md">
        {code ? (
          <div className="text-6xl font-bold tracking-tight text-brand-deep">{code}</div>
        ) : (
          icon && (
            <span className={cn('mx-auto grid h-16 w-16 place-items-center rounded-full', iconTone)}>
              <Icon name={icon} className="h-8 w-8" />
            </span>
          )
        )}
        <h1 className="mt-4 text-2xl font-bold text-ink">{title}</h1>
        <p className="mx-auto mt-2 max-w-sm text-muted">{message}</p>
        {actions && <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">{actions}</div>}
        <div className="mt-10 flex items-center justify-center gap-1.5 text-sm text-muted">
          <Icon name="logo" className="h-4 w-4 text-brand" /> School24
        </div>
      </div>
    </div>
  )
}
