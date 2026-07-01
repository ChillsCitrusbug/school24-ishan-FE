import { cn } from '@/lib/cn'
import { Card } from '../atoms/Card'
import { Button } from '../molecules/Button'
import { Badge, type Tone } from '../atoms/Badge'
import { Icon } from '../atoms/Icon'

export interface FoodItemCardProps {
  name: string
  desc?: string
  price: string
  tag?: { label: string; tone?: Tone }
  /** gradient for the thumbnail placeholder (photography slots in later) */
  thumb?: string
  disabled?: boolean
  onAdd?: () => void
}

/** Horizontal menu item — thumbnail + name/price + Add. Used for quick re-order and menu lists. */
export function FoodItemCard({ name, desc, price, tag, thumb, disabled, onAdd }: FoodItemCardProps) {
  return (
    <Card className={cn('flex items-center gap-3 p-3', disabled && 'opacity-60')}>
      <div
        className="grid h-14 w-14 shrink-0 place-items-center rounded-control text-white/90"
        style={{ background: thumb ?? 'linear-gradient(135deg,#7FC8B8,#0F8A78)' }}
      >
        <Icon name="order" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-ink">{name}</span>
          {tag && <Badge tone={tag.tone ?? 'neutral'}>{tag.label}</Badge>}
        </div>
        {desc && <div className="truncate text-xs text-muted">{desc}</div>}
        <div className="mt-0.5 text-sm font-semibold text-brand-deep">{price}</div>
      </div>
      <Button size="sm" leadingIcon="plus" onClick={onAdd} disabled={disabled}>
        Add
      </Button>
    </Card>
  )
}
