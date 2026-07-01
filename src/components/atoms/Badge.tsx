import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type Tone = 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const TONES: Record<Tone, string> = {
  brand: 'bg-brand/10 text-brand-deep',
  accent: 'bg-accent/12 text-accent-deep',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  neutral: 'bg-line/70 text-muted',
}

/** Soft, tinted pill — for categories, counts, labels. */
export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-medium', TONES[tone], className)}>
      {children}
    </span>
  )
}
