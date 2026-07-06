import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { useAuth } from '@/features/auth/useAuth'
import { getCart, type Cart } from '@/features/cart/api'
import { extractErrorMessage } from '@/lib/api-error'

/**
 * SC-073 · Cart Review — Parent's own reuse, for a linked child
 * (FR-037). Same structure as `CartScreen.tsx` (FR-035/036) — kept
 * separate for the same reasoning as `ParentMenuBrowseScreen.tsx`. The
 * cart API itself is unchanged — `GET/POST .../students/{id}/cart...`
 * already accepts a Parent actor (FR-033's own combined authorization).
 */
export function ParentCartScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const childId = searchParams.get('childId') ?? ''

  const [cart, setCart] = useState<Cart | null>(null)
  const [error, setError] = useState<string | null>(null)

  function load() {
    if (!childId) return
    setError(null)
    getCart(childId)
      .then(setCart)
      .catch((err: unknown) => {
        setError(extractErrorMessage(err, 'The cart could not be loaded.'))
      })
  }

  useEffect(load, [childId])

  const money = (n: string) => `$${Number(n).toFixed(2)}`

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={[]}
          user={{ initials: '', name: user?.full_name ?? '', role: 'Parent' }}
        />
      }
      topbar={<Topbar searchPlaceholder="Search the menu…" />}
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate(`/parent/menu?childId=${childId}`)}
        >
          Menu
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-ink">Cart</h1>
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
              title="This cart is empty"
              message="Add items from the canteen menu to get started."
              action={
                <Button leadingIcon="order" onClick={() => navigate(`/parent/menu?childId=${childId}`)}>
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
              onClick={() => navigate(`/parent/checkout?childId=${childId}`)}
            >
              Checkout · {money(cart.total)}
            </Button>
          </>
        )}
      </div>
    </AppShell>
  )
}
