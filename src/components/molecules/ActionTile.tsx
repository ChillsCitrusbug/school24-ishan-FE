import { cn } from '@/lib/cn'
import { Icon, type IconName } from '../atoms/Icon'

/** Compact vertical icon+label action — used in child cards and quick-action rows. */
export function ActionTile({
  icon,
  label,
  tone = 'brand',
  onClick,
}: {
  icon: IconName
  label: string
  tone?: 'brand' | 'accent'
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-card py-2.5 text-xs text-ink transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        tone === 'accent' ? 'bg-accent/10 hover:bg-accent/20' : 'bg-mint hover:bg-brand/10',
      )}
    >
      <Icon name={icon} className={cn('h-5 w-5', tone === 'accent' ? 'text-accent' : 'text-brand')} strokeWidth={1.7} />
      {label}
    </button>
  )
}
