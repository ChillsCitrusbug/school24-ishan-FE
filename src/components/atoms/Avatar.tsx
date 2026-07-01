import { cn } from '@/lib/cn'

type Tone = 'brand' | 'accent' | 'neutral' | 'child'

const TONES: Record<Tone, string> = {
  brand: 'bg-brand/12 text-brand-deep',
  accent: 'bg-accent/15 text-accent-deep',
  neutral: 'bg-line text-muted',
  child: 'bg-mint text-brand-deep',
}

const SIZES = {
  sm: 'h-6 w-6 text-[11px]',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-lg',
} as const

export function Avatar({
  initials,
  tone = 'brand',
  size = 'md',
  className,
}: {
  initials: string
  tone?: Tone
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-bold',
        TONES[tone],
        SIZES[size],
        className,
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}
