import { cn } from '@/lib/cn'

export interface DonutSegment {
  label: string
  value: number
  color: string
}

/**
 * Donut chart via SVG stroke-dasharray on a circumference-100 circle (r = 15.915).
 * Presentational: pass segments + colours; optional centre label and legend.
 */
export function DonutChart({
  segments,
  centerTop,
  centerValue,
  showLegend = true,
  formatValue = (n) => String(n),
  className,
}: {
  segments: DonutSegment[]
  centerTop?: string
  centerValue?: string
  showLegend?: boolean
  formatValue?: (n: number) => string
  className?: string
}) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  let acc = 0

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 36 36" className="h-32 w-32 -rotate-90">
          {/* track — the `line` token value (#E6ECE8); SVG stroke needs a literal */}
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#E6ECE8" strokeWidth="3.4" />
          {segments.map((seg) => {
            const pct = total ? (seg.value / total) * 100 : 0
            const el = (
              <circle
                key={seg.label}
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke={seg.color}
                strokeWidth="3.4"
                strokeDasharray={`${pct} ${100 - pct}`}
                strokeDashoffset={-acc}
              />
            )
            acc += pct
            return el
          })}
        </svg>
        {(centerTop || centerValue) && (
          <div className="absolute inset-0 grid place-content-center text-center">
            {centerTop && <div className="text-[11px] leading-none text-muted">{centerTop}</div>}
            {centerValue && <div className="text-lg font-bold leading-tight text-ink">{centerValue}</div>}
          </div>
        )}
      </div>
      {showLegend && (
        <ul className="flex-1 space-y-2 text-sm">
          {segments.map((seg) => (
            <li key={seg.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: seg.color }} />
              {seg.label}
              <span className="ml-auto font-semibold text-ink">{formatValue(seg.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
