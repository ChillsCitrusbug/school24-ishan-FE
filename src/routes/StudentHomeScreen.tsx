import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  Button,
  BalanceHero,
  FoodItemCard,
  Banner,
  ErrorState,
  Card,
  Spinner,
  Icon,
} from '@/components'
import { useStudentAuth } from '@/features/student-auth/useStudentAuth'
import { addCartItem } from '@/features/cart/api'
import { getStudentDashboard, type FrequentItem, type StudentDashboard } from '@/features/student-dashboard/api'
import { extractErrorMessage } from '@/lib/api-error'

/**
 * SC-070 · Student Home / Quick-Reorder Dashboard (FR-047). Reuses the
 * approved Sc070StudentHome.tsx structure. Replaces the generic
 * StudentPlaceholderHome.tsx now that the real dashboard is built
 * (same "placeholder retired once the real screen ships" precedent as
 * FR-010/FR-018's own dashboards).
 *
 * Field-reconciliation: the mock's own "Chicken Wrap + Apple Juice"-
 * style fabricated multi-product bundle name has no backing Combo row
 * in this schema — real frequent items show only real, individual
 * product/combo names, never an invented bundle label. "Low balance"
 * reuses `WalletScreen.tsx`'s own already-established threshold
 * (exactly $0.00), not a new arbitrary numeric cutoff.
 */
export function StudentHomeScreen() {
  const { student } = useStudentAuth()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!student?.id) return
    setError(null)
    setDashboard(null)
    getStudentDashboard(student.id)
      .then(setDashboard)
      .catch((err: unknown) => setError(extractErrorMessage(err, 'Your dashboard could not be loaded.')))
  }, [student])

  useEffect(() => {
    load()
  }, [load])

  async function handleAdd(item: FrequentItem) {
    if (!student?.id) return
    if (item.item_type === 'product' && item.has_variants) {
      navigate(`/student/menu/products/${item.id}`)
      return
    }
    setAddingId(item.id)
    setActionError(null)
    try {
      await addCartItem(student.id, {
        item_type: item.item_type,
        quantity: 1,
        ...(item.item_type === 'product' ? { product_id: item.id } : { combo_id: item.id }),
      })
    } catch (err) {
      setActionError(extractErrorMessage(err, 'Could not add this item. Please try again.'))
    } finally {
      setAddingId(null)
    }
  }

  const low = dashboard?.wallet_balance === '0.00'

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={[]}
          user={{ initials: '', name: student?.full_name ?? '', role: 'Student' }}
        />
      }
      topbar={
        <Topbar
          searchPlaceholder="Search the canteen menu…"
          right={<IconButton icon="bell" label="Notifications" onClick={() => navigate('/student/inbox')} />}
        />
      }
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            Hi {student?.full_name?.split(' ')[0] ?? ''} 👋
          </h1>
          <p className="mt-0.5 text-sm text-muted">Grab your usual in a tap.</p>
        </div>

        {error ? (
          <Card className="p-6">
            <ErrorState message={error} action={<Button onClick={load}>Try again</Button>} />
          </Card>
        ) : dashboard === null ? (
          <div role="status" aria-label="Loading your dashboard" className="flex justify-center py-10 text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <>
            <BalanceHero
              label="Your balance"
              balance={`$${dashboard.wallet_balance}`}
              low={low}
              sublabel={low ? 'Running low — ask a parent or top up' : undefined}
              action={
                <Button leadingIcon="plus" onClick={() => navigate('/student/wallet/top-up')}>
                  Top up
                </Button>
              }
            />

            {low && (
              <div className="flex items-center gap-2 rounded-card border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent-deep">
                <Icon name="alert" className="h-4 w-4" strokeWidth={1.8} />
                Low balance — top up to keep ordering this week.
              </div>
            )}

            {actionError && <Banner tone="danger">{actionError}</Banner>}

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink">Order again</h2>
                <Button variant="ghost" size="sm" trailingIcon="arrowRight" onClick={() => navigate('/student/menu')}>
                  Browse menu
                </Button>
              </div>
              {dashboard.frequent_items.length === 0 ? (
                <Card className="p-6">
                  <p className="text-center text-sm text-muted">
                    No orders yet — browse the menu to place your first one.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {dashboard.frequent_items.map((item) => (
                    <FoodItemCard
                      key={`${item.item_type}-${item.id}`}
                      name={item.name}
                      price={`$${item.price}`}
                      disabled={!item.available || item.blocked || addingId === item.id}
                      onAdd={() => handleAdd(item)}
                    />
                  ))}
                </div>
              )}
            </div>

            <Button variant="secondary" fullWidth leadingIcon="order" onClick={() => navigate('/student/menu')}>
              Browse the full menu
            </Button>
          </>
        )}
      </div>
    </AppShell>
  )
}
