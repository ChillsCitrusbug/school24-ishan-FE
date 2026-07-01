import type { ReactNode } from 'react'
import { Icon } from '../atoms/Icon'

const VALUE_PROPS = [
  'Per-child spending controls',
  'Order tracking in real time',
  'Secure payments by Stripe',
]

/** Split auth layout — mint brand panel (desktop) + centered form. No app shell. */
export function AuthLayout({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* brand panel — desktop only */}
      <div className="hidden flex-col justify-between bg-mint p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-card bg-brand text-white">
            <Icon name="logo" />
          </span>
          <span className="text-xl font-bold text-ink">School24</span>
        </div>
        <div>
          <h2 className="max-w-sm text-3xl font-bold leading-tight text-ink">
            The cashless canteen for your whole family.
          </h2>
          <p className="mt-3 max-w-sm text-muted">
            Top up once, set what they can buy, and let them order lunch in seconds.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-ink">
            {VALUE_PROPS.map((v) => (
              <li key={v} className="flex items-center gap-2.5">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-brand/15 text-brand">
                  <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.4} />
                </span>
                {v}
              </li>
            ))}
          </ul>
        </div>
        <div className="text-xs text-muted">© 2026 School24 · Greenvale Primary</div>
      </div>

      {/* form panel */}
      <div className="flex flex-col items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-card bg-brand text-white">
              <Icon name="logo" />
            </span>
            <span className="text-xl font-bold text-ink">School24</span>
          </div>
          {children}
          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
