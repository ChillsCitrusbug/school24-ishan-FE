import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from '../atoms/Icon'

type Tone = 'default' | 'danger'

/** Presentational modal dialog — for confirms (incl. destructive). Visibility is controlled by `open`. */
export function Dialog({
  open,
  tone = 'default',
  title,
  children,
  footer,
  onClose,
}: {
  open: boolean
  tone?: Tone
  title: string
  children?: ReactNode
  footer?: ReactNode
  onClose?: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-card border border-line bg-white shadow-pop">
        <div className="flex items-start gap-3 p-5">
          {tone === 'danger' && (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-danger-soft text-danger">
              <Icon name="alert" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-ink">{title}</h3>
            {children && <div className="mt-1 text-sm text-muted">{children}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
            <Icon name="close" />
          </button>
        </div>
        {footer && <div className={cn('flex justify-end gap-2 border-t border-line px-5 py-3')}>{footer}</div>}
      </div>
    </div>
  )
}
