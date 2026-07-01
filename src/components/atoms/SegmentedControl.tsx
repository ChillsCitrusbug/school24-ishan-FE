import { cn } from '@/lib/cn'

export interface Segment {
  value: string
  label: string
  dotColor?: string
}

/** Toggle group (categories, filters, tabs). A labelled group of pressable buttons. */
export function SegmentedControl({
  segments,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  segments: Segment[]
  value: string
  onChange?: (value: string) => void
  ariaLabel?: string
  className?: string
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn('inline-flex rounded-control border border-line bg-mint p-1', className)}>
      {segments.map((s) => {
        const active = s.value === value
        return (
          <button
            key={s.value}
            aria-pressed={active}
            onClick={() => onChange?.(s.value)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm transition',
              active ? 'bg-white font-semibold text-ink shadow-softer' : 'text-muted hover:text-ink',
            )}
          >
            {s.dotColor && <span className="h-2 w-2 rounded-full" style={{ background: s.dotColor }} />}
            {s.label}
          </button>
        )
      })}
    </div>
  )
}
