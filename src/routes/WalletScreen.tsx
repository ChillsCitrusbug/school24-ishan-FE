import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  Button,
  Card,
  CardHeader,
  BalanceHero,
  EmptyState,
  ErrorState,
  Icon,
  Spinner,
} from '@/components'
import { cn } from '@/lib/cn'
import {
  getMyParentWalletId,
  getMyStudentWalletId,
  getWallet,
  getWalletTransactions,
  type Wallet,
  type WalletTransaction,
} from '@/features/wallet/api'
import { TXN_DISPLAY, formatTxnAmount, formatTxnDate } from '@/features/wallet/txnDisplay'
import { extractErrorMessage } from '@/lib/api-error'

interface WalletScreenProps {
  role: 'parent' | 'student'
  displayName: string
  roleLabel: string
  topUpHref: string
  historyHref: string
}

/**
 * SC-051 · Wallet Overview / Balance Home — Parent/Student (FR-031).
 * Reuses the approved Sc051Wallet.tsx structure/components as-is, one
 * shared component parameterized by role (same "one shared component,
 * role passed as a prop" precedent as WalletTopUpScreen.tsx —
 * field-reconciliation decision #7).
 *
 * Field-reconciliation decision #10: transaction rows show a generic,
 * type-derived title ("Top-up"/"Purchase"/"Refund"), not the mock's
 * own illustrative product-level description — that data isn't
 * available to this read-only ledger view.
 */
export function WalletScreen({ role, displayName, roleLabel, topUpHref, historyHref }: WalletScreenProps) {
  const navigate = useNavigate()
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const load = useCallback(() => {
    setError(null)
    const resolveWalletId = role === 'parent' ? getMyParentWalletId : getMyStudentWalletId
    resolveWalletId()
      .then((walletId) => Promise.all([getWallet(walletId), getWalletTransactions(walletId)]))
      .then(([walletResult, txns]) => {
        if (!mountedRef.current) return
        setWallet(walletResult)
        setTransactions(txns)
      })
      .catch((err: unknown) => {
        if (mountedRef.current) setError(extractErrorMessage(err, 'Something went wrong.'))
      })
  }, [role])

  useEffect(() => {
    load()
  }, [load])

  const isLoading = wallet === null && !error
  const recentTransactions = (transactions ?? []).slice(0, 5)

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={[]}
          user={{ initials: displayName.slice(0, 1).toUpperCase(), name: displayName, role: roleLabel }}
        />
      }
      topbar={
        <Topbar
          searchPlaceholder="Search transactions…"
          right={
            <>
              <IconButton icon="bell" label="Notifications" />
              <Button leadingIcon="plus" onClick={() => navigate(topUpHref)}>
                Top up
              </Button>
            </>
          }
        />
      }
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-ink">Your wallet</h1>
          <p className="mt-0.5 text-sm text-muted">Top up and track your canteen spending.</p>
        </div>

        {isLoading ? (
          <div role="status" aria-label="Loading your wallet" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : error ? (
          <Card className="p-6">
            <ErrorState
              message={error}
              action={
                <Button variant="secondary" onClick={load}>
                  Try again
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            <BalanceHero
              balance={`$${wallet?.balance ?? '0.00'}`}
              low={wallet?.balance === '0.00'}
              sublabel={wallet?.balance === '0.00' ? 'Add funds to start ordering' : 'Available to spend'}
              action={
                <div className="flex gap-2">
                  <Button leadingIcon="plus" onClick={() => navigate(topUpHref)}>
                    Top up
                  </Button>
                </div>
              }
            />

            <Card>
              <CardHeader
                title="Transactions"
                subtitle="top-ups, purchases and refunds"
                action={
                  recentTransactions.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => navigate(historyHref)}>
                      See all
                    </Button>
                  )
                }
                className="border-b border-line"
              />
              {recentTransactions.length === 0 ? (
                <EmptyState
                  icon="wallet"
                  title="No transactions yet"
                  message="Once you top up or place an order, it’ll show here."
                  action={
                    <Button leadingIcon="plus" onClick={() => navigate(topUpHref)}>
                      Top up wallet
                    </Button>
                  }
                />
              ) : (
                <ul className="divide-y divide-line">
                  {recentTransactions.map((t) => {
                    const display = TXN_DISPLAY[t.type]
                    return (
                      <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                        <span
                          className={cn(
                            'grid h-9 w-9 place-items-center rounded-control',
                            display.positive ? 'bg-success-soft text-success' : 'bg-mint text-muted',
                          )}
                        >
                          <Icon name={display.icon} className="h-4 w-4" strokeWidth={1.7} />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-ink">{display.title}</div>
                          <div className="text-xs text-muted">
                            {formatTxnDate(t.created_at)}
                            {t.status !== 'success' && ` · ${t.status === 'pending' ? 'Pending' : 'Failed'}`}
                          </div>
                        </div>
                        <span
                          className={cn(
                            'ml-auto text-sm font-semibold',
                            t.status !== 'success' ? 'text-muted' : display.positive ? 'text-success' : 'text-ink',
                          )}
                        >
                          {formatTxnAmount(t)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
