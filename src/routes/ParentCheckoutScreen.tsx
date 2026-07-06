import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AppShell,
  Banner,
  Button,
  Card,
  ErrorState,
  MobileTabBar,
  Sidebar,
  Spinner,
  Topbar,
} from '@/components'
import { getActiveContext, type ActiveChild } from '@/features/child-selection/api'
import { getCart, type Cart } from '@/features/cart/api'
import { childCheckout } from '@/features/checkout/api'
import { getChildWallet, getMyParentWalletId, getWallet, type Wallet } from '@/features/wallet/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/cn'

interface WalletChoice {
  key: 'parent' | 'child'
  label: string
  wallet: Wallet
}

/**
 * SC-075 · Parent Checkout & Wallet Selection (FR-037). Reuses the
 * approved Sc075ParentCheckout.tsx structure — a radiogroup choosing
 * between the parent's own wallet and the selected child's own
 * wallet, defaulting to the parent's own (EC-040's own explicit
 * default), never a hardcoded literal threshold like the mock's own
 * demo data — insufficiency is computed from each wallet's own real
 * balance against the real cart total.
 */
export function ParentCheckoutScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const childId = searchParams.get('childId') ?? ''

  const [children, setChildren] = useState<ActiveChild[] | null>(null)
  const [cart, setCart] = useState<Cart | null>(null)
  const [choices, setChoices] = useState<WalletChoice[] | null>(null)
  const [selectedKey, setSelectedKey] = useState<'parent' | 'child'>('parent')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  function load() {
    if (!childId) return
    setLoadError(null)
    Promise.all([
      getActiveContext(),
      getCart(childId),
      getMyParentWalletId().then(getWallet),
      getChildWallet(childId),
    ])
      .then(([activeChildren, cartResult, parentWallet, childWallet]) => {
        setChildren(activeChildren)
        setCart(cartResult)
        const child = activeChildren.find((c) => c.student_id === childId)
        setChoices([
          { key: 'parent', label: 'Your wallet', wallet: parentWallet },
          { key: 'child', label: `${child?.full_name ?? 'Child'}'s wallet`, wallet: childWallet },
        ])
      })
      .catch((err: unknown) => {
        setLoadError(extractErrorMessage(err, 'Your checkout details could not be loaded.'))
      })
  }

  useEffect(load, [childId])

  const money = (n: string) => `$${Number(n).toFixed(2)}`
  const selected = choices?.find((c) => c.key === selectedKey) ?? null
  const insufficient =
    cart !== null && selected !== null && Number(selected.wallet.balance) < Number(cart.total)

  async function handlePay() {
    if (!childId || !selected) return
    setPaying(true)
    setPayError(null)
    try {
      const order = await childCheckout(childId, selected.wallet.id)
      navigate('/parent/checkout/receipt', { state: { order, childId } })
    } catch (err) {
      setPayError(extractErrorMessage(err, 'Checkout failed. Please review the cart and try again.'))
      load()
    } finally {
      setPaying(false)
    }
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={[]}
          user={{ initials: '', name: user?.full_name ?? '', role: 'Parent' }}
        />
      }
      topbar={<Topbar searchPlaceholder="Search…" />}
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-lg">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate(`/parent/cart?childId=${childId}`)}
        >
          Cart
        </Button>

        {loadError ? (
          <Card className="mt-4 p-6">
            <ErrorState message={loadError} action={<Button onClick={load}>Try again</Button>} />
          </Card>
        ) : cart === null || choices === null || children === null ? (
          <div role="status" aria-label="Loading checkout" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-ink">Checkout</h1>
            <p className="mt-0.5 text-sm text-muted">Choose which wallet pays for this order</p>

            {payError && (
              <div className="mt-4">
                <Banner tone="danger">{payError}</Banner>
              </div>
            )}

            <Card className="mt-5">
              <div className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">
                Order summary
              </div>
              <ul className="divide-y divide-line">
                {cart.items.map((line) => (
                  <li key={line.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-ink">
                      <span className="text-muted">{line.quantity}×</span> {line.name}
                    </span>
                    <span className="font-medium text-ink">{money(line.line_total)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-line px-4 py-3">
                <span className="font-semibold text-ink">Total</span>
                <span className="font-bold text-ink">{money(cart.total)}</span>
              </div>
            </Card>

            <div
              role="radiogroup"
              aria-label="Choose a wallet"
              className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {choices.map((choice) => {
                const short = Number(choice.wallet.balance) < Number(cart.total)
                return (
                  <button
                    key={choice.key}
                    type="button"
                    role="radio"
                    aria-checked={selectedKey === choice.key}
                    onClick={() => setSelectedKey(choice.key)}
                    className={cn(
                      'rounded-card border p-4 text-left transition',
                      selectedKey === choice.key
                        ? 'border-brand bg-brand/10'
                        : 'border-line hover:bg-canvas',
                      short && 'ring-1 ring-accent/40',
                    )}
                  >
                    <div className="text-sm font-medium text-ink">{choice.label}</div>
                    <div className={cn('text-xs', short ? 'font-medium text-accent' : 'text-muted')}>
                      Balance {money(choice.wallet.balance)}
                    </div>
                  </button>
                )
              })}
            </div>

            {insufficient && selected && (
              <div className="mt-3 rounded-control bg-accent/10 px-3 py-2.5 text-sm text-accent-deep">
                This wallet is short by {money(String(Number(cart.total) - Number(selected.wallet.balance)))}.
                Switch wallet or top up.
              </div>
            )}

            {insufficient ? (
              <Button
                fullWidth
                leadingIcon="plus"
                className="mt-4"
                onClick={() =>
                  navigate(
                    selectedKey === 'parent'
                      ? '/parent/wallet/top-up'
                      : `/parent/wallet/top-up-child?childId=${childId}`,
                  )
                }
              >
                Top up {selected?.label}
              </Button>
            ) : (
              <Button fullWidth leadingIcon="lock" className="mt-4" loading={paying} onClick={handlePay}>
                Pay from {selected?.label} · {money(cart.total)}
              </Button>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
