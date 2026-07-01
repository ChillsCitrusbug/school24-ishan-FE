import type { ReactNode } from 'react'
import { Icon } from '../atoms/Icon'

/** Labelled form field. Wraps the control in a <label> so the two are associated for a11y. */
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {error && (
        <span className="mt-1 flex items-center gap-1 text-xs text-danger">
          <Icon name="alert" className="h-3.5 w-3.5" /> {error}
        </span>
      )}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}
