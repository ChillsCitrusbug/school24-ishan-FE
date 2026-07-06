import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Spinner,
} from '@/components'
import { useStudentAuth } from '@/features/student-auth/useStudentAuth'
import { getCart, type Cart } from '@/features/cart/api'
import { extractErrorMessage } from '@/lib/api-error'

/**
 * SC-073 · Cart Review (enforce: re-validate) — Student (FR-035/036).
 * Reuses the approved Sc073Cart.tsx structure. Read-only for line
 * items — quantity adjustment/removal is still out of scope (no
 * ticket in this batch owns it). FR-036 wires the mock's own
 * "Checkout" button to the real checkout flow (`StudentCheckoutScreen`).
 */
export function CartScreen() {
  const { student } = useStudentAuth()
  const navigate = useNavigate()
  const studentId = student?.id ?? ''

  const [cart, setCart] = useState<Cart | null>(null)
  const [error, setError] = useState<string | null>(null)

  function load() {
    if (!studentId) return
    setError(null)
    getCart(studentId)
      .then(setCart)
      .catch((err: unknown) => {
        setError(extractErrorMessage(err, 'Your cart could not be loaded.'))
      })
  }

  useEffect(load, [studentId])

  const money = (n: string) => `$${Number(n).toFixed(2)}`

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={[]}
          user={{ initials: '', name: student?.full_name ?? '', role: 'Student' }}
        />
      }
      topbar={<Topbar searchPlaceholder="Search the menu…" />}
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-2xl">
        <Button variant="ghost" size="sm" leadingIcon="chevronLeft" className="mb-3" onClick={() => navigate('/student/menu')}>
          Menu
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-ink">Your cart</h1>
        </div>

        {error ? (
          <Card className="mt-6">
            <ErrorState
              message={error}
              action={
                <Button variant="secondary" onClick={load}>
                  Try again
                </Button>
              }
            />
          </Card>
        ) : cart === null ? (
          <div role="status" aria-label="Loading cart" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : cart.items.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon="order"
              title="Your cart is empty"
              message="Add items from the canteen menu to get started."
              action={
                <Button leadingIcon="order" onClick={() => navigate('/student/menu')}>
                  Browse menu
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            <Card className="mt-5 divide-y divide-line">
              {cart.items.map((line) => (
                <div key={line.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink">{line.name}</div>
                    {line.variant_label && <div className="text-xs text-muted">{line.variant_label}</div>}
                    <div className="text-sm text-muted">Qty {line.quantity}</div>
                  </div>
                  <div className="text-sm font-semibold text-brand-deep">{money(line.line_total)}</div>
                </div>
              ))}
            </Card>

            <Card className="mt-4 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="text-ink">{money(cart.total)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-line pt-2">
                <span className="font-semibold text-ink">Total</span>
                <span className="font-bold text-ink">{money(cart.total)}</span>
              </div>
            </Card>

            <Button
              fullWidth
              className="mt-4"
              trailingIcon="arrowRight"
              onClick={() => navigate('/student/checkout')}
            >
              Checkout · {money(cart.total)}
            </Button>
          </>
        )}
      </div>
    </AppShell>
  )
}
