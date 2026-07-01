import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from '../atoms/Icon'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

/** Styled native select with a chevron. */
export function Select({ invalid = false, className, children, ...props }: SelectProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        className={cn(
          'w-full appearance-none rounded-control border bg-canvas py-2 pl-3 pr-9 text-sm text-ink focus:outline-none focus:ring-2',
          invalid ? 'border-danger focus:border-danger focus:ring-danger/30' : 'border-line focus:border-brand/40 focus:ring-brand/30',
        )}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {children}
      </select>
      <Icon name="chevronDown" className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted" strokeWidth={1.8} />
    </div>
  )
}
