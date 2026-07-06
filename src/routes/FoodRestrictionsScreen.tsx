import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AppShell,
  Banner,
  Button,
  Card,
  CardHeader,
  Dialog,
  EmptyState,
  ErrorState,
  Icon,
  Input,
  MobileTabBar,
  Sidebar,
  Spinner,
  Topbar,
} from '@/components'
import { getActiveContext, type ActiveChild } from '@/features/child-selection/api'
import * as foodRestrictionsApi from '@/features/food-restrictions/api'
import { extractErrorMessage } from '@/lib/api-error'

/**
 * Sc067Restrictions.tsx — a Parent blocks a specific product or an
 * entire category for a specific linked child (FR-032).
 *
 * Field-reconciliation decision #8: the mock's own hardcoded 2-child
 * SegmentedControl is replaced with the real `?childId=` contract
 * `ChildWalletTopUpScreen.tsx` (FR-029) already established — this
 * screen receives the child via the URL, resolved by the SAME
 * `ChildSelectScreen.tsx` mechanism, or directly from a per-child
 * action already knowing the id.
 *
 * FR-034 wires the mock's own per-item "Unblock" (×) affordance back
 * in — deliberately omitted when FR-032 first built this screen, since
 * removal was a separate, explicitly out-of-scope ticket at the time.
 * Gated behind a destructive-confirm Dialog (this ticket's own DoD),
 * same tone/footer pattern as `SchoolDetailScreen.tsx`'s own
 * deactivate-confirm (FR-008) — the approved mock shows the "×" button
 * itself but no confirm-dialog state, so this is the same disclosed,
 * minimal extension every prior destructive single-click action in
 * this codebase has needed.
 */
export function FoodRestrictionsScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const childId = searchParams.get('childId')

  const [children, setChildren] = useState<ActiveChild[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [restrictions, setRestrictions] = useState<foodRestrictionsApi.FoodRestriction[] | null>(
    null,
  )

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<foodRestrictionsApi.CatalogItem[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [removeTarget, setRemoveTarget] = useState<foodRestrictionsApi.FoodRestriction | null>(
    null,
  )
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  useEffect(() => {
    getActiveContext()
      .then((result) => setChildren(result))
      .catch((err: unknown) => {
        setLoadError(extractErrorMessage(err, 'Your children could not be loaded.'))
      })
  }, [])

  const child = children?.find((c) => c.student_id === childId) ?? null

  useEffect(() => {
    if (!child) return
    let cancelled = false
    foodRestrictionsApi
      .listRestrictions(child.student_id)
      .then((result) => {
        if (!cancelled) setRestrictions(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(extractErrorMessage(err, 'Restrictions could not be loaded.'))
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child?.student_id])

  async function handleSearch() {
    if (!child) return
    setSearching(true)
    setActionError(null)
    try {
      const found = await foodRestrictionsApi.searchCatalog(child.student_id, query)
      setResults(found)
    } catch (err) {
      setActionError(extractErrorMessage(err, 'Search failed. Please try again.'))
    } finally {
      setSearching(false)
    }
  }

  async function handleAdd(item: foodRestrictionsApi.CatalogItem) {
    if (!child) return
    setAdding(item.id)
    setActionError(null)
    try {
      const created = await foodRestrictionsApi.createRestriction(child.student_id, {
        restriction_type: item.type,
        ...(item.type === 'product' ? { product_id: item.id } : { category_id: item.id }),
      })
      setRestrictions((prev) => (prev ? [created, ...prev] : [created]))
      setResults((prev) => prev?.filter((r) => r.id !== item.id) ?? null)
    } catch (err) {
      setActionError(extractErrorMessage(err, 'Could not block this item. Please try again.'))
    } finally {
      setAdding(null)
    }
  }

  async function handleRemove() {
    if (!child || !removeTarget) return
    setRemoving(true)
    setRemoveError(null)
    try {
      await foodRestrictionsApi.removeRestriction(child.student_id, removeTarget.id)
      setRestrictions((prev) => prev?.filter((r) => r.id !== removeTarget.id) ?? null)
      setRemoveTarget(null)
    } catch (err) {
      setRemoveError(extractErrorMessage(err, 'Could not unblock this item. Please try again.'))
    } finally {
      setRemoving(false)
    }
  }

  const blockedProducts = restrictions?.filter((r) => r.restriction_type === 'product') ?? []
  const blockedCategories = restrictions?.filter((r) => r.restriction_type === 'category') ?? []

  return (
    <AppShell
      sidebar={<Sidebar brandTitle="School24" groups={[]} user={{ initials: '', name: '', role: 'Parent' }} />}
      topbar={<Topbar />}
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => navigate('/parent/children')}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <Icon name="chevronLeft" className="h-4 w-4" /> My children
        </button>

        <h1 className="text-2xl font-bold text-ink">Food restrictions</h1>
        <p className="mt-0.5 text-sm text-muted">
          Choose what each child can&apos;t buy. Changes apply to new orders right away.
        </p>

        {loadError ? (
          <Card className="mt-5 p-6">
            <ErrorState message={loadError} />
          </Card>
        ) : !childId ? (
          <Card className="mt-5 p-6">
            <ErrorState message="No child was selected. Please choose a child first." />
          </Card>
        ) : children === null ? (
          <div role="status" aria-label="Loading" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : !child ? (
          <Card className="mt-5 p-6">
            <ErrorState message="You can only manage food restrictions once your link to this child is approved." />
          </Card>
        ) : (
          <>
            {actionError && (
              <div className="mt-4">
                <Banner tone="danger">{actionError}</Banner>
              </div>
            )}

            <Card className="mt-5 p-5">
              <div className="mb-2 text-sm font-medium text-ink">Block an item or category</div>
              <div className="flex gap-2">
                <Input
                  leadingIcon="search"
                  placeholder="Search the canteen menu…"
                  aria-label="Search items to block"
                  className="flex-1"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSearch()
                  }}
                />
                <Button leadingIcon="search" onClick={handleSearch} loading={searching}>
                  Search
                </Button>
              </div>

              {results && (
                <ul className="mt-3 divide-y divide-line rounded-control border border-line">
                  {results.length === 0 ? (
                    <li className="px-4 py-3 text-sm text-muted">No matching items or categories.</li>
                  ) : (
                    results.map((item) => (
                      <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="flex-1 text-sm text-ink">{item.name}</span>
                        <span className="text-xs text-muted">
                          {item.type === 'product' ? 'Product' : 'Category'}
                        </span>
                        <Button
                          leadingIcon="plus"
                          onClick={() => handleAdd(item)}
                          loading={adding === item.id}
                        >
                          Add
                        </Button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </Card>

            {restrictions === null ? (
              <div role="status" aria-label="Loading restrictions" className="mt-6 flex justify-center text-muted">
                <Spinner className="h-6 w-6" />
              </div>
            ) : restrictions.length === 0 ? (
              <Card className="mt-5">
                <EmptyState
                  icon="shield"
                  title="No restrictions set"
                  message={`${child.full_name} can currently buy anything on the menu. Block an item or a whole category to limit what they can order.`}
                />
              </Card>
            ) : (
              <>
                {blockedProducts.length > 0 && (
                  <Card className="mt-4">
                    <CardHeader
                      title="Blocked products"
                      subtitle={`${blockedProducts.length} items`}
                      className="border-b border-line"
                    />
                    <ul className="divide-y divide-line">
                      {blockedProducts.map((r) => (
                        <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-danger-soft text-danger">
                            <Icon name="shield" className="h-5 w-5" strokeWidth={1.7} />
                          </span>
                          <span className="flex-1 text-sm text-ink">{r.name}</span>
                          <button
                            type="button"
                            aria-label={`Unblock ${r.name}`}
                            onClick={() => setRemoveTarget(r)}
                            className="text-muted transition hover:text-danger"
                          >
                            <Icon name="close" className="h-5 w-5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {blockedCategories.length > 0 && (
                  <Card className="mt-4 p-5">
                    <div className="mb-3 text-sm font-semibold text-ink">Blocked categories</div>
                    <div className="flex flex-wrap gap-2">
                      {blockedCategories.map((r) => (
                        <span
                          key={r.id}
                          className="inline-flex items-center gap-1.5 rounded-pill bg-danger-soft px-3 py-1.5 text-sm font-medium text-danger"
                        >
                          {r.name}
                          <button
                            type="button"
                            aria-label={`Unblock ${r.name}`}
                            onClick={() => setRemoveTarget(r)}
                            className="hover:text-danger/70"
                          >
                            <Icon name="close" className="h-3.5 w-3.5" strokeWidth={2.2} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </>
        )}

        {removeTarget && (
          <Dialog
            open
            onClose={() => {
              setRemoveTarget(null)
              setRemoveError(null)
            }}
            tone="danger"
            title={`Unblock "${removeTarget.name}"?`}
            footer={
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setRemoveTarget(null)
                    setRemoveError(null)
                  }}
                >
                  Cancel
                </Button>
                <Button variant="danger" loading={removing} onClick={handleRemove}>
                  Unblock
                </Button>
              </>
            }
          >
            {removeError && (
              <div className="mb-3">
                <Banner tone="danger">{removeError}</Banner>
              </div>
            )}
            <p className="text-sm text-muted">
              {removeTarget.name} will become orderable again for {child?.full_name} right away —
              there is no automatic expiry, and this is the only way to undo the block.
            </p>
          </Dialog>
        )}
      </div>
    </AppShell>
  )
}
