import { cn } from '@/lib/cn'
import { Icon } from '../atoms/Icon'

/** Accessible checkbox (button-based). */
export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange?: (value: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'grid h-5 w-5 place-items-center rounded border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        checked ? 'border-brand bg-brand text-white' : 'border-line bg-white hover:border-brand/50',
      )}
    >
      {checked && <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} />}
    </button>
  )
}
