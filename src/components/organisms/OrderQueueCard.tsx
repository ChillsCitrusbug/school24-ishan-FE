import { Card } from '../atoms/Card'
import { Button } from '../molecules/Button'
import { Avatar } from '../atoms/Avatar'

type Status = 'pending' | 'preparing' | 'ready'

const ACTION: Record<Status, string> = {
  pending: 'Start preparing',
  preparing: 'Mark ready',
  ready: 'Complete',
}

export interface OrderQueueCardProps {
  id: string
  student: string
  cls: string
  items: string
  total: string
  wait: string
  status: Status
  onAdvance?: () => void
  onOpen?: () => void
}

/** A single order card on the fulfilment board. */
export function OrderQueueCard({ id, student, cls, items, total, wait, status, onAdvance, onOpen }: OrderQueueCardProps) {
  return (
    <Card className="p-3">
      <button onClick={onOpen} aria-label={`Open order ${id}`} className="block w-full text-left">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted">#{id}</span>
          <span className="text-xs text-muted">{wait}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Avatar initials={student[0]} tone="brand" size="sm" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-ink">{student}</div>
            <div className="text-xs text-muted">{cls}</div>
          </div>
        </div>
        <div className="mt-2 truncate text-sm text-ink">{items}</div>
      </button>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-bold text-ink">{total}</span>
        <Button size="sm" trailingIcon={status === 'ready' ? 'check' : 'arrowRight'} onClick={onAdvance}>
          {ACTION[status]}
        </Button>
      </div>
    </Card>
  )
}
