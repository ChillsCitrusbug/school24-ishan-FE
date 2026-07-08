import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppShell,
  Banner,
  Button,
  Card,
  ErrorState,
  Icon,
  MobileTabBar,
  Sidebar,
  Spinner,
  Topbar,
} from '@/components'
import { getCart, type Cart } from '@/features/cart/api'
import { studentCheckout } from '@/features/checkout/api'
import { getMyStudentWalletId, getWallet } from '@/features/wallet/api'
import { useStudentAuth } from '@/features/student-auth/useStudentAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/cn'
import { studentNavGroups, studentTabs } from './studentNav'

/**
 * SC-074 · Student Checkout & Wallet Confirmation (FR-036). Reuses the
 * approved Sc074StudentCheckout.tsx structure — its own "success"
 * state is NOT shown inline here; a successful checkout instead
 * navigates to the shared receipt screen (Sc077, FR-036/037), matching
 * that mock's own doc comment naming it a genuinely separate, shared
 * screen rather than a state toggle of this one.
 *
 * The order data for the receipt screen is passed via router
 * navigation state (this ticket's own checkout response already
 * returns the full order + line items) rather than a fresh
 * `GET /orders/{id}` fetch — that read endpoint is FR-040's own scope,
 * not yet built in this batch.
 */
export function StudentCheckoutScreen() {
  const { student } = useStudentAuth()
  const navigate = useNavigate()
  const studentId = student?.id ?? ''

  const [cart, setCart] = useState<Cart | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  function load() {
    if (!studentId) return
    setLoadError(null)
    Promise.all([getCart(studentId), getMyStudentWalletId().then(getWallet)])
      .then(([cartResult, wallet]) => {
        setCart(cartResult)
        setBalance(wallet.balance)
      })
      .catch((err: unknown) => {
        setLoadError(extractErrorMessage(err, 'Your checkout details could not be loaded.'))
      })
  }

  useEffect(load, [studentId])

  const money = (n: string) => `$${Number(n).toFixed(2)}`
  const insufficient = cart !== null && balance !== null && Number(balance) < Number(cart.total)

  async function handlePay() {
    if (!studentId) return
    setPaying(true)
    setPayError(null)
    try {
      const order = await studentCheckout(studentId)
      navigate('/student/checkout/receipt', { state: { order } })
    } catch (err) {
      setPayError(extractErrorMessage(err, 'Checkout failed. Please review your cart and try again.'))
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
          groups={studentNavGroups('menu')}
          user={{ initials: '', name: student?.full_name ?? '', role: 'Student' }}
        />
      }
      topbar={<Topbar searchPlaceholder="Search…" />}
      mobileNav={<MobileTabBar items={studentTabs('menu')} />}
    >
      <div className="mx-auto max-w-lg">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate('/student/cart')}
        >
          Cart
        </Button>

        {loadError ? (
          <Card className="mt-4 p-6">
            <ErrorState message={loadError} action={<Button onClick={load}>Try again</Button>} />
          </Card>
        ) : cart === null || balance === null ? (
          <div role="status" aria-label="Loading checkout" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-ink">Checkout</h1>
            <p className="mt-0.5 text-sm text-muted">Pay from your wallet</p>

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

            <Card className={cn('mt-4 p-4', insufficient && 'ring-1 ring-accent/40')}>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-control bg-brand/10 text-brand">
                  <Icon name="wallet" className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <div>
                  <div className="text-sm font-medium text-ink">Your wallet</div>
                  <div className={cn('text-xs', insufficient ? 'font-medium text-accent' : 'text-muted')}>
                    Balance {money(balance)}
                  </div>
                </div>
              </div>
              {insufficient && (
                <div className="mt-3 flex items-center gap-2 rounded-control bg-accent/10 px-3 py-2.5 text-sm text-accent-deep">
                  <Icon name="alert" className="h-4 w-4" /> You need{' '}
                  {money(String(Number(cart.total) - Number(balance)))} more to place this order.
                </div>
              )}
            </Card>

            {insufficient ? (
              <Button fullWidth leadingIcon="plus" className="mt-4" onClick={() => navigate('/student/wallet/top-up')}>
                Add funds
              </Button>
            ) : (
              <Button fullWidth leadingIcon="lock" className="mt-4" loading={paying} onClick={handlePay}>
                Pay &amp; place order · {money(cart.total)}
              </Button>
            )}
            <p className="mt-2 text-center text-xs text-muted">
              Payment is taken from the wallet immediately and can&apos;t be undone.
            </p>
          </>
        )}
      </div>
    </AppShell>
  )
}
