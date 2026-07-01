import { Icon } from '../atoms/Icon'

/** −/+ quantity stepper. Used in product detail & cart. */
export function QtyStepper({
  value,
  onChange,
  min = 1,
}: {
  value: number
  onChange?: (value: number) => void
  min?: number
}) {
  return (
    <div className="inline-flex items-center rounded-control border border-line">
      <button
        aria-label="Decrease quantity"
        onClick={() => onChange?.(Math.max(min, value - 1))}
        disabled={value <= min}
        className="grid h-9 w-9 place-items-center text-muted hover:text-ink disabled:opacity-40"
      >
        <Icon name="minus" className="h-4 w-4" strokeWidth={2} />
      </button>
      <span className="w-9 text-center text-sm font-semibold text-ink">{value}</span>
      <button
        aria-label="Increase quantity"
        onClick={() => onChange?.(value + 1)}
        className="grid h-9 w-9 place-items-center text-muted hover:text-ink"
      >
        <Icon name="plus" className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  )
}
