import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { useStudentAuth } from '@/features/student-auth/useStudentAuth'
import {
  listMenuCategories,
  listMenuItems,
  type MenuCategory,
  type MenuItem,
} from '@/features/menu-browse/api'
import { addCartItem, getCart } from '@/features/cart/api'
import { extractErrorMessage } from '@/lib/api-error'

const ALL = 'All'

/**
 * SC-071 · Canteen Menu Browse (enforce: hide/disable restricted) —
 * Student (FR-035). Reuses the approved Sc071MenuBrowse.tsx structure
 * (category SegmentedControl + MenuCard grid); Parent's own version is
 * FR-037's separate wrapper, out of scope here.
 *
 * Field-reconciliation: combos have no `category_id` in this schema
 * (unlike the mock's own decorative fixture) — they only ever appear
 * in the unfiltered "All" view, per the backend's own documented
 * decision. A product WITH variants navigates to its detail screen on
 * "Add" (a size must be chosen there); a product with none, or a
 * combo, adds directly from the grid.
 */
export function MenuBrowseScreen() {
  const { student } = useStudentAuth()
  const navigate = useNavigate()
  const studentId = student?.id ?? ''

  const [categories, setCategories] = useState<MenuCategory[] | null>(null)
  const [items, setItems] = useState<MenuItem[] | null>(null)
  const [activeCategory, setActiveCategory] = useState(ALL)
  const [cartCount, setCartCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId) return
    listMenuCategories(studentId).then(setCategories).catch(() => undefined)
  }, [studentId])

  const refreshCartCount = useCallback(() => {
    if (!studentId) return
    getCart(studentId)
      .then((cart) => setCartCount(cart.items.reduce((sum, i) => sum + i.quantity, 0)))
      .catch(() => undefined)
  }, [studentId])

  useEffect(() => {
    refreshCartCount()
  }, [refreshCartCount])

  const loadItems = useCallback(() => {
    if (!studentId) return
    setError(null)
    const categoryId = activeCategory === ALL ? undefined : activeCategory
    listMenuItems(studentId, categoryId)
      .then(setItems)
      .catch((err: unknown) => {
        setError(extractErrorMessage(err, 'The menu could not be loaded.'))
      })
  }, [studentId, activeCategory])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  async function handleAdd(item: MenuItem) {
    if (item.item_type === 'product' && item.has_variants) {
      navigate(`/student/menu/products/${item.id}`)
      return
    }
    setAddingId(item.id)
    setActionError(null)
    try {
      await addCartItem(studentId, {
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
          groups={[]}
          user={{ initials: '', name: student?.full_name ?? '', role: 'Student' }}
        />
      }
      topbar={
        <Topbar
          searchPlaceholder="Search the menu…"
          right={
            <Button leadingIcon="order" onClick={() => navigate('/student/cart')}>
              Cart · {cartCount}
            </Button>
          }
        />
      }
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-ink">Canteen menu</h1>
          <p className="mt-0.5 text-sm text-muted">Browse and add items to your cart.</p>
        </div>

        {actionError && (
          <div className="mt-4">
            <Banner tone="danger">{actionError}</Banner>
          </div>
        )}

        {error ? (
          <Card className="mt-6">
            <ErrorState
              message={error}
              action={
                <Button variant="secondary" onClick={loadItems}>
                  Try again
                </Button>
              }
            />
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
                        item.item_type === 'product'
                          ? `/student/menu/products/${item.id}`
                          : `/student/menu/combos/${item.id}`,
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
