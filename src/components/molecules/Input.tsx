import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from '../atoms/Icon'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: IconName
  invalid?: boolean
}

export function Input({ leadingIcon, invalid = false, className, ...props }: InputProps) {
  return (
    <div className={cn('relative', className)}>
      {leadingIcon && (
        <Icon name={leadingIcon} className="absolute left-3 top-2.5 h-4 w-4 text-muted" strokeWidth={1.7} />
      )}
      <input
        className={cn(
          'w-full rounded-control border bg-canvas py-2 pr-3 text-sm text-ink placeholder:text-muted/80',
          'focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-line/40 disabled:text-muted',
          leadingIcon ? 'pl-9' : 'pl-3',
          invalid
            ? 'border-danger focus:border-danger focus:ring-danger/30'
            : 'border-line focus:border-brand/40 focus:ring-brand/30',
        )}
        aria-invalid={invalid || undefined}
        {...props}
      />
    </div>
  )
}
