import { useState } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'
import {
  DATE_RANGE_PRESETS,
  computeDateRangePreset,
  type DateRangePreset,
  type DateRangeSelection,
} from '@/lib/date-range-presets'

/** No calendar-grid component exists anywhere in the approved design
 * system (Sc086/Sc087/Sc068's own "1–30 June 2026" button is a static
 * mock label with no real interaction ever designed for it) — this
 * makes that button genuinely functional using only already-approved
 * primitives (`Dialog` + `Button`) rather than inventing a new
 * dropdown/calendar visual language. */
export function DateRangeButton({
  label,
  onSelect,
}: {
  label: string
  onSelect: (selection: DateRangeSelection) => void
}) {
  const [open, setOpen] = useState(false)

  function handlePreset(preset: DateRangePreset) {
    onSelect(computeDateRangePreset(preset))
    setOpen(false)
  }

  return (
    <>
      <Button variant="secondary" leadingIcon="calendar" trailingIcon="chevronDown" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} title="Select date range" onClose={() => setOpen(false)}>
        <div className="grid grid-cols-2 gap-2 pt-2">
          {DATE_RANGE_PRESETS.map((preset) => (
            <Button key={preset.value} variant="secondary" onClick={() => handlePreset(preset.value)}>
              {preset.label}
            </Button>
          ))}
        </div>
      </Dialog>
    </>
  )
}
