import { cloneElement, isValidElement, useId, type ReactNode } from 'react'
import { Icon } from '../atoms/Icon'

/**
 * Labelled form field. Wraps the control in a <label> so the two are
 * associated for a11y.
 *
 * The hint/error is a SIBLING of the <label>, not nested inside it —
 * testing-library's own wrapper-label implicit-association computes a
 * label's accessible name from all of its own text content, so nesting
 * the hint/error there used to fold it into the name too (e.g. "Role"
 * became "RoleOptional — you can assign this later"), breaking both
 * `getByLabelText`-style queries and real screen readers for any field
 * with a hint/error. `aria-describedby` (cloned onto the child control,
 * since `children` is opaque) links the two correctly instead.
 */
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
  const describedById = useId()
  const describedBy = error || hint ? describedById : undefined
  const control =
    describedBy && isValidElement(children)
      ? cloneElement(children as React.ReactElement<{ 'aria-describedby'?: string }>, {
          'aria-describedby': describedBy,
        })
      : children

  return (
    <div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
        {control}
      </label>
      {error && (
        <span id={describedById} className="mt-1 flex items-center gap-1 text-xs text-danger">
          <Icon name="alert" className="h-3.5 w-3.5" /> {error}
        </span>
      )}
      {hint && !error && (
        <span id={describedById} className="mt-1 block text-xs text-muted">
          {hint}
        </span>
      )}
    </div>
  )
}
