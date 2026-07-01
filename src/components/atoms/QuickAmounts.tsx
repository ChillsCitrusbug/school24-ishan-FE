import { cn } from '@/lib/cn'

/** Quick top-up amount grid. Presentational: highlights the selected value. */
export function QuickAmounts({
  amounts,
  value,
  onSelect,
}: {
  amounts: number[]
  value?: number
  onSelect?: (amount: number) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {amounts.map((a) => (
        <button
          key={a}
          onClick={() => onSelect?.(a)}
          className={cn(
            'rounded-control border py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
            value === a ? 'border-brand bg-brand/10 text-brand-deep' : 'border-line text-ink hover:bg-canvas',
          )}
        >
          ${a}
        </button>
      ))}
    </div>
  )
}
