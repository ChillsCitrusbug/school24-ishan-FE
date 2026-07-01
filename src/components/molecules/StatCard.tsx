import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Card } from '../atoms/Card'
import { Icon, type IconName } from '../atoms/Icon'

const ICON_TONES = {
  brand: 'bg-brand/10 text-brand',
  accent: 'bg-accent/12 text-accent',
} as const

export function StatCard({
  label,
  value,
  icon,
  iconTone = 'brand',
  hint,
  className,
}: {
  label: string
  value: ReactNode
  icon?: IconName
  iconTone?: keyof typeof ICON_TONES
  hint?: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        {icon && (
          <span className={cn('grid h-8 w-8 place-items-center rounded-control', ICON_TONES[iconTone])}>
            <Icon name={icon} className="h-4 w-4" strokeWidth={1.7} />
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold text-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </Card>
  )
}
