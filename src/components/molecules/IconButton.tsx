import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from '../atoms/Icon'

type Variant = 'bordered' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  bordered: 'border border-line text-muted hover:bg-canvas hover:text-ink',
  ghost: 'text-muted hover:bg-canvas hover:text-ink',
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  label: string
  variant?: Variant
  badge?: ReactNode
}

export function IconButton({ icon, label, variant = 'bordered', badge, className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'relative grid h-9 w-9 place-items-center rounded-control transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      <Icon name={icon} />
      {badge != null && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
    </button>
  )
}
