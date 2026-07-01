import { cn } from '@/lib/cn'
import { Icon } from '../atoms/Icon'

export interface TimelineStep {
  label: string
  time?: string
  state: 'done' | 'current' | 'upcoming'
}

/** Vertical order-status timeline — Placed → Preparing → Ready → Completed. */
export function OrderTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol>
      {steps.map((s, i) => {
        const last = i === steps.length - 1
        return (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-full',
                  s.state === 'done' && 'bg-brand text-white',
                  s.state === 'current' && 'bg-brand/15 text-brand ring-2 ring-brand',
                  s.state === 'upcoming' && 'bg-line text-muted',
                )}
              >
                {s.state === 'done' ? (
                  <Icon name="check" className="h-4 w-4" strokeWidth={2.2} />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-current" />
                )}
              </span>
              {!last && <span className={cn('w-0.5 flex-1', s.state === 'done' ? 'bg-brand' : 'bg-line')} style={{ minHeight: 28 }} />}
            </div>
            <div className={cn('pb-6', last && 'pb-0')}>
              <div className={cn('font-medium', s.state === 'upcoming' ? 'text-muted' : 'text-ink')}>{s.label}</div>
              {s.time && <div className="text-xs text-muted">{s.time}</div>}
              {s.state === 'current' && (
                <div className="mt-1 inline-flex items-center gap-1.5 rounded-pill bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand-deep">
                  In progress
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
