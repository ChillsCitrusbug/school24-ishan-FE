import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Card } from '../atoms/Card'
import { Icon } from '../atoms/Icon'

/**
 * Prominent wallet balance. White card (Direction B keeps green as accent/CTA, never a full fill);
 * the large brand-coloured figure carries the anchor-colour weight.
 */
export function BalanceHero({
  label = 'Wallet balance',
  balance,
  sublabel,
  low,
  action,
}: {
  label?: string
  balance: string
  sublabel?: ReactNode
  low?: boolean
  action?: ReactNode
}) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="grid h-8 w-8 place-items-center rounded-control bg-brand/10 text-brand">
              <Icon name="wallet" className="h-4 w-4" strokeWidth={1.7} />
            </span>
            {label}
          </div>
          <div className={cn('mt-2 text-4xl font-bold', low ? 'text-accent-deep' : 'text-brand-deep')}>{balance}</div>
          {sublabel && <div className="mt-1 text-sm text-muted">{sublabel}</div>}
        </div>
        {action}
      </div>
    </Card>
  )
}
