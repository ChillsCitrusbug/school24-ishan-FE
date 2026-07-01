export interface BarSeries {
  label: string
  color: string
}

export interface BarGroup {
  label: string
  /** one value per series, in series order */
  values: number[]
}

/**
 * Grouped vertical bar chart — pure SVG-free CSS. Presentational: pass data + colours.
 * y-axis ticks and gridlines share the exact plot height so the $0 baseline aligns with the bars.
 */
export function BarChart({
  series,
  groups,
  max,
  ticks,
  height = 176,
  formatValue = (n) => String(n),
}: {
  series: BarSeries[]
  groups: BarGroup[]
  max?: number
  ticks?: number[]
  height?: number
  formatValue?: (n: number) => string
}) {
  const computedMax = max ?? Math.max(1, ...groups.flatMap((g) => g.values))
  const tickList = ticks ?? [computedMax, computedMax * 0.5, 0]

  return (
    <div className="flex gap-3">
      {/* y-axis */}
      <div className="flex flex-col justify-between pr-1 text-right text-[11px] text-muted" style={{ height }}>
        {tickList.map((t, i) => (
          <span key={i}>{formatValue(t)}</span>
        ))}
      </div>
      {/* plot */}
      <div className="relative flex-1">
        <div className="absolute inset-0 flex flex-col justify-between">
          {tickList.map((_, i) => (
            <div key={i} className="border-t border-line" />
          ))}
        </div>
        <div className="relative flex items-end justify-around" style={{ height }}>
          {groups.map((g) => (
            <div key={g.label} className="flex flex-col items-center gap-2">
              <div className="flex items-end gap-1.5" style={{ height }}>
                {g.values.map((v, i) => (
                  <div
                    key={i}
                    className="w-6 rounded-t-md transition-[filter] hover:brightness-95"
                    style={{ height: `${Math.round((v / computedMax) * height)}px`, background: series[i].color }}
                    title={`${series[i].label} · ${g.label} · ${formatValue(v)}`}
                  />
                ))}
              </div>
              <span className="text-[11px] text-muted">{g.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
