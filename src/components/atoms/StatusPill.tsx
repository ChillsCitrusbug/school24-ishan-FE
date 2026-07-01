import { cn } from '@/lib/cn'

/** Status shown as a coloured dot + text label — never colour alone (a11y). */
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent'

const DOT: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-muted',
  accent: 'bg-accent',
}

const TEXT: Record<StatusTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
  neutral: 'text-muted',
  accent: 'text-accent-deep',
}

export function StatusPill({ tone, label, className }: { tone: StatusTone; label: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', TEXT[tone], className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT[tone])} />
      {label}
    </span>
  )
}
