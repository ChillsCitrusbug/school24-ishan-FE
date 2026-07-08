import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  Button,
  SegmentedControl,
  MenuCard,
  EmptyState,
  ErrorState,
  Card,
  Banner,
  Spinner,
} from '@/components'
import { useAuth } from '@/features/auth/useAuth'
import { getActiveContext, type ActiveChild } from '@/features/child-selection/api'
import {
  listChildMenuCategories,
  listChildMenuItems,
} from '@/features/child-menu-browse/api'
import type { MenuCategory, MenuItem } from '@/features/menu-browse/api'
import { addCartItem, getCart } from '@/features/cart/api'
import { extractErrorMessage } from '@/lib/api-error'
import { parentNavGroups, parentTabs } from './parentNav'

const ALL = 'All'

/**
 * SC-071 · Canteen Menu Browse — Parent's own reuse, for a linked
 * child (FR-037). Same structure as `MenuBrowseScreen.tsx` (FR-035,
 * Student's own version) — kept as a SEPARATE screen rather than
 * parameterizing the already-reviewed, already-committed Student
 * screen, to avoid re-opening that ticket's own settled code; the
 * duplication is the ticket's own explicit "share the backend, not
 * necessarily the FE" scope (FR-035 only shares its menu-read/cart
 * BACKEND with FR-037, per its own field-reconciliation decision #7).
 *
 * The child being ordered for comes from the SAME `?childId=` URL
 * contract `ChildSelectScreen`/`FoodRestrictionsScreen` already
 * established, not a hardcoded 2-child SegmentedControl.
 */
export function ParentMenuBrowseScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const childId = searchParams.get('childId')

  const [children, setChildren] = useState<ActiveChild[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [categories, setCategories] = useState<MenuCategory[] | null>(null)
  const [items, setItems] = useState<MenuItem[] | null>(null)
  const [activeCategory, setActiveCategory] = useState(ALL)
  const [cartCount, setCartCount] = useState(0)
  const [actionError, setActionError] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    getActiveContext()
      .then(setChildren)
      .catch((err: unknown) => {
        setLoadError(extractErrorMessage(err, 'Your children could not be loaded.'))
      })
  }, [])

  const child = children?.find((c) => c.student_id === childId) ?? null

  useEffect(() => {
    if (!child) return
    listChildMenuCategories(child.student_id).then(setCategories).catch(() => undefined)
  }, [child])

  const refreshCartCount = useCallback(() => {
    if (!child) return
    getCart(child.student_id)
      .then((cart) => setCartCount(cart.items.reduce((sum, i) => sum + i.quantity, 0)))
      .catch(() => undefined)
  }, [child])

  useEffect(() => {
    refreshCartCount()
  }, [refreshCartCount])

  const loadItems = useCallback(() => {
    if (!child) return
    setLoadError(null)
    const categoryId = activeCategory === ALL ? undefined : activeCategory
    listChildMenuItems(child.student_id, categoryId)
      .then(setItems)
      .catch((err: unknown) => {
        setLoadError(extractErrorMessage(err, 'The menu could not be loaded.'))
      })
  }, [child, activeCategory])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  async function handleAdd(item: MenuItem) {
    if (!child) return
    if (item.item_type === 'product' && item.has_variants) {
      navigate(`/parent/menu/products/${item.id}?childId=${child.student_id}`)
      return
    }
    setAddingId(item.id)
    setActionError(null)
    try {
      await addCartItem(child.student_id, {
        item_type: item.item_type,
        quantity: 1,
        ...(item.item_type === 'product' ? { product_id: item.id } : { combo_id: item.id }),
      })
      refreshCartCount()
    } catch (err) {
      setActionError(extractErrorMessage(err, 'Could not add this item. Please try again.'))
    } finally {
      setAddingId(null)
    }
  }

  const segments = [
    { value: ALL, label: ALL },
    ...(categories ?? []).map((c) => ({ value: c.id, label: c.name })),
  ]

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={parentNavGroups('order')}
          user={{ initials: '', name: user?.full_name ?? '', role: 'Parent' }}
        />
      }
      topbar={
        <Topbar
          searchPlaceholder="Search the menu…"
          right={
            child && (
              <Button
                leadingIcon="order"
                onClick={() => navigate(`/parent/cart?childId=${child.student_id}`)}
              >
                Cart · {cartCount}
              </Button>
            )
          }
        />
      }
      mobileNav={<MobileTabBar items={parentTabs('order')} />}
    >
      <div className="mx-auto max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-ink">Canteen menu</h1>
          <p className="mt-0.5 text-sm text-muted">
            {child ? `Browse and add items to ${child.full_name}'s cart.` : 'Browse the menu.'}
          </p>
        </div>

        {actionError && (
          <div className="mt-4">
            <Banner tone="danger">{actionError}</Banner>
          </div>
        )}

        {loadError ? (
          <Card className="mt-6">
            <ErrorState message={loadError} />
          </Card>
        ) : !childId ? (
          <Card className="mt-6">
            <ErrorState message="No child was selected. Please choose a child first." />
          </Card>
        ) : children === null ? (
          <div role="status" aria-label="Loading" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : !child ? (
          <Card className="mt-6">
            <ErrorState message="You can only order for this child once your link is approved." />
          </Card>
        ) : items === null ? (
          <div role="status" aria-label="Loading menu" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : items.length === 0 && activeCategory === ALL ? (
          <Card className="mt-6">
            <EmptyState
              icon="order"
              title="Menu not available"
              message="The canteen hasn't published today's menu yet. Check back soon."
            />
          </Card>
        ) : (
          <>
            <div className="mt-5 overflow-x-auto pb-1">
              <SegmentedControl
                ariaLabel="Menu categories"
                value={activeCategory}
                onChange={setActiveCategory}
                segments={segments}
              />
            </div>
            {items.length === 0 ? (
              <Card className="mt-5">
                <EmptyState icon="order" title="No items in this category" message="Try a different category." />
              </Card>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((item) => (
                  <MenuCard
                    key={item.id}
                    name={item.name}
                    desc={item.description ?? undefined}
                    price={`$${item.base_price}`}
                    tag={item.item_type === 'combo' ? { label: 'Combo', tone: 'accent' } : undefined}
                    blocked={item.blocked}
                    onOpen={() =>
                      navigate(
                        `/parent/menu/${item.item_type === 'product' ? 'products' : 'combos'}/${item.id}?childId=${child.student_id}`,
                      )
                    }
                    onAdd={addingId === item.id ? undefined : () => handleAdd(item)}
                    testId={`menu-item-${item.id}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
