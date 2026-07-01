import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from '../atoms/Icon'

type Tone = 'info' | 'danger' | 'warning' | 'success'

const TONES: Record<Tone, string> = {
  info: 'bg-info-soft text-info',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  success: 'bg-success-soft text-success',
}
const ICONS: Record<Tone, IconName> = { info: 'bell', danger: 'alert', warning: 'alert', success: 'check' }

/** Inline notice / form-level message. */
export function Banner({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div className={cn('flex items-start gap-2 rounded-control px-3 py-2.5 text-sm', TONES[tone])}>
      <Icon name={ICONS[tone]} className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  )
}
