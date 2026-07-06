import { cn } from '@/lib/cn'
import { Card } from '../atoms/Card'
import { Button } from '../molecules/Button'
import { Badge, type Tone } from '../atoms/Badge'
import { Icon } from '../atoms/Icon'

export interface MenuCardProps {
  name: string
  desc?: string
  price: string
  thumb?: string
  tag?: { label: string; tone?: Tone }
  /** restricted for this child by a parent */
  blocked?: boolean
  onAdd?: () => void
  onOpen?: () => void
  /** FR-035 — scopes a specific card for e2e tests; a grid of many
   * cards otherwise gives no reliable way to target one card's own Add
   * button over another's (a shared ancestor div "contains" every
   * card's text). */
  testId?: string
}

/** Vertical menu item — image, name, price, Add. Used in the menu browse grid. */
export function MenuCard({ name, desc, price, thumb, tag, blocked, onAdd, onOpen, testId }: MenuCardProps) {
  return (
    <Card className="overflow-hidden" data-testid={testId}>
      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative h-28" style={{ background: thumb ?? 'linear-gradient(135deg,#7FC8B8,#0F8A78)' }}>
          {tag && (
            <span className="absolute left-2 top-2">
              <Badge tone={tag.tone ?? 'neutral'}>{tag.label}</Badge>
            </span>
          )}
          {blocked && (
            <div className="absolute inset-0 grid place-items-center bg-ink/55 text-xs font-medium text-white">
              <span className="flex items-center gap-1.5">
                <Icon name="shield" className="h-4 w-4" /> Blocked by a parent
              </span>
            </div>
          )}
        </div>
        <div className="px-3 pt-3">
          <div className="truncate font-semibold text-ink">{name}</div>
          {desc && <div className="truncate text-xs text-muted">{desc}</div>}
        </div>
      </button>
      <div className="flex items-center justify-between px-3 pb-3 pt-2">
        <span className={cn('font-bold', blocked ? 'text-muted' : 'text-brand-deep')}>{price}</span>
        <Button size="sm" leadingIcon="plus" disabled={blocked} onClick={onAdd}>
          Add
        </Button>
      </div>
    </Card>
  )
}
