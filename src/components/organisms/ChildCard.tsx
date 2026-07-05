import { cn } from '@/lib/cn'
import { Card } from '../atoms/Card'
import { Avatar } from '../atoms/Avatar'
import { Badge } from '../atoms/Badge'
import { ActionTile } from '../molecules/ActionTile'

export interface ChildCardProps {
  initials: string
  name: string
  meta: string
  balance?: string
  low?: boolean
  pending?: boolean
  /** FR-029 — wired to the "Top up" tile only; Order/Limits/Spend stay
   * decorative (those flows, FR-037 and beyond, don't exist yet). */
  onTopUp?: () => void
}

/** A child tile — balance + quick actions, or a pending-approval row. Used on Parent Home & My Children. */
export function ChildCard({ initials, name, meta, balance, low, pending, onTopUp }: ChildCardProps) {
  if (pending) {
    return (
      <Card className="flex items-center gap-3 border-dashed bg-white/70 p-4">
        <Avatar initials={initials} tone="neutral" />
        <div className="min-w-0">
          <div className="font-semibold text-muted">{name}</div>
          <div className="text-xs text-muted">Link request pending school approval</div>
        </div>
        <Badge tone="warning" className="ml-auto">
          Pending
        </Badge>
      </Card>
    )
  }

  return (
    <Card className={cn('p-4', low && 'ring-1 ring-accent/30')}>
      <div className="flex items-center gap-3">
        <Avatar initials={initials} tone={low ? 'accent' : 'brand'} />
        <div className="min-w-0">
          <div className="font-semibold text-ink">{name}</div>
          <div className="text-xs text-muted">{meta}</div>
        </div>
        <div className="ml-auto text-right">
          <div className={cn('text-xs', low ? 'font-medium text-accent' : 'text-muted')}>
            {low ? 'Low balance' : 'Balance'}
          </div>
          <div className={cn('text-xl font-bold', low ? 'text-accent' : 'text-brand-deep')}>{balance}</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        <ActionTile icon="plus" label="Top up" tone={low ? 'accent' : 'brand'} onClick={onTopUp} />
        <ActionTile icon="order" label="Order" />
        <ActionTile icon="shield" label="Limits" />
        <ActionTile icon="chart" label="Spend" />
      </div>
    </Card>
  )
}
