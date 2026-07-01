import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** White surface · soft border · soft shadow · 12px radius. The base panel. */
export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cn('rounded-card border border-line bg-white shadow-softer', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-5 py-3.5', className)}>
      <div>
        <h3 className="font-semibold text-ink">{title}</h3>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
