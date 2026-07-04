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
  SegmentedControl,
  EmptyState,
  ErrorState,
  Icon,
  Spinner,
} from '@/components'
import { cn } from '@/lib/cn'
import {
  getMyParentWalletId,
  getMyStudentWalletId,
  getWalletTransactions,
  type WalletTransaction,
} from '@/features/wallet/api'
import { TXN_DISPLAY, formatTxnAmount, formatTxnDate } from '@/features/wallet/txnDisplay'
import { extractErrorMessage } from '@/lib/api-error'

interface TxnHistoryScreenProps {
  role: 'parent' | 'student'
  displayName: string
  roleLabel: string
  backHref: string
  topUpHref: string
}

const FILTER_TYPE: Record<string, WalletTransaction['type'] | null> = {
  all: null,
  topups: 'top_up',
  purchases: 'deduction',
  refunds: 'refund',
}

/**
 * SC-058 · Wallet Transaction History — Parent/Student (FR-031).
 * Reuses the approved Sc058TxnHistory.tsx structure/components as-is,
 * one shared component parameterized by role. The type-filter segments
 * are client-side only (field-reconciliation decision #8) — the full
 * history is always fetched once, filtered in the browser.
 */
export function TxnHistoryScreen({
  role,
  displayName,
  roleLabel,
  backHref,
  topUpHref,
}: TxnHistoryScreenProps) {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState<WalletTransaction[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
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
      .then((walletId) => getWalletTransactions(walletId))
      .then((txns) => {
        if (mountedRef.current) setTransactions(txns)
      })
      .catch((err: unknown) => {
        if (mountedRef.current) setError(extractErrorMessage(err, 'Something went wrong.'))
      })
  }, [role])

  useEffect(() => {
    load()
  }, [load])

  const isLoading = transactions === null && !error
  const activeType = FILTER_TYPE[filter]
  const filtered = (transactions ?? []).filter((t) => activeType === null || t.type === activeType)

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
          right={<IconButton icon="bell" label="Notifications" />}
        />
      }
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate(backHref)}
        >
          Wallet
        </Button>
        <h1 className="text-2xl font-bold text-ink">Transaction history</h1>
        <p className="mt-0.5 text-sm text-muted">All top-ups, purchases and refunds.</p>

        {isLoading ? (
          <div role="status" aria-label="Loading transactions" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : error ? (
          <Card className="mt-6 p-6">
            <ErrorState
              message={error}
              action={
                <Button variant="secondary" onClick={load}>
                  Try again
                </Button>
              }
            />
          </Card>
        ) : (transactions ?? []).length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon="wallet"
              title="No transactions yet"
              message="When you top up or place an order, it’ll appear here."
              action={
                <Button leadingIcon="plus" onClick={() => navigate(topUpHref)}>
                  Top up wallet
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            <div className="mt-5 overflow-x-auto pb-1">
              <SegmentedControl
                ariaLabel="Filter transactions"
                value={filter}
                onChange={setFilter}
                segments={[
                  { value: 'all', label: 'All' },
                  { value: 'topups', label: 'Top-ups' },
                  { value: 'purchases', label: 'Purchases' },
                  { value: 'refunds', label: 'Refunds' },
                ]}
              />
            </div>
            {filtered.length === 0 ? (
              <Card className="mt-4 p-6 text-center text-sm text-muted">
                No transactions match this filter.
              </Card>
            ) : (
              <Card className="mt-4 divide-y divide-line">
                {filtered.map((t) => {
                  const display = TXN_DISPLAY[t.type]
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-5 py-3">
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
                    </div>
                  )
                })}
              </Card>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
