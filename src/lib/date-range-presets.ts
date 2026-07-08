/** Mock-parity date-range picker for FR-045/FR-046's own report screens
 * (Sc086/Sc087/Sc068's own "1–30 June 2026" button). No calendar-grid
 * component exists anywhere in the approved design system — this
 * offers a small, fixed set of presets instead of inventing a new
 * visual primitive, reusing the already-approved `Dialog` as the
 * picker's own container.
 */

export type DateRangePreset = 'this_month' | 'last_month' | 'last_7_days' | 'all_time'

export interface DateRangeSelection {
  date_from?: string
  date_to?: string
  label: string
}

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'all_time', label: 'All time' },
]

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatMonthRange(from: Date, to: Date): string {
  const month = from.toLocaleDateString('en-US', { month: 'long' })
  const year = from.getFullYear()
  return `${from.getDate()}–${to.getDate()} ${month} ${year}`
}

export function computeDateRangePreset(
  preset: DateRangePreset,
  now: Date = new Date(),
): DateRangeSelection {
  if (preset === 'all_time') {
    return { label: 'All time' }
  }
  if (preset === 'last_7_days') {
    const to = new Date(now)
    const from = new Date(now)
    from.setDate(from.getDate() - 6)
    return {
      date_from: toISODate(from),
      date_to: toISODate(to),
      label: `${toISODate(from)} – ${toISODate(to)}`,
    }
  }
  if (preset === 'this_month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { date_from: toISODate(from), date_to: toISODate(to), label: formatMonthRange(from, to) }
  }
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const to = new Date(now.getFullYear(), now.getMonth(), 0)
  return { date_from: toISODate(from), date_to: toISODate(to), label: formatMonthRange(from, to) }
}
