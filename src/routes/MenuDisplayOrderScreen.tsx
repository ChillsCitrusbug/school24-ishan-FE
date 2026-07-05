import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  Button,
  Card,
  Banner,
  Icon,
  Spinner,
} from '@/components'
import {
  listCategories,
  listProductsInCategory,
  reorderCategories,
  reorderProductsInCategory,
  type Category,
  type CategoryProduct,
} from '@/features/categories/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'
import { staffNavGroups, staffTabs } from './staffNav'

interface CategoryWithProducts extends Category {
  products: CategoryProduct[]
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function SortableProductRow({ product }: { product: CategoryProduct }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: product.id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-control px-2 py-2 hover:bg-canvas"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag ${product.name}`}
        className="cursor-grab text-muted"
      >
        <Icon name="drag" className="h-4 w-4" strokeWidth={1.7} />
      </button>
      <span className="flex-1 text-sm text-ink">{product.name}</span>
    </div>
  )
}

function SortableCategoryCard({
  category,
  onProductsReorder,
}: {
  category: CategoryWithProducts
  onProductsReorder: (categoryId: string, productIds: string[]) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: category.id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const productSensors = useSensors(useSensor(PointerSensor))

  function handleProductDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = category.products.findIndex((p) => p.id === active.id)
    const newIndex = category.products.findIndex((p) => p.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(category.products, oldIndex, newIndex)
    onProductsReorder(
      category.id,
      reordered.map((p) => p.id),
    )
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="p-4">
        <div className="mb-2 flex items-center gap-3">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag ${category.name}`}
            data-testid="category-drag-handle"
            className="cursor-grab text-muted"
          >
            <Icon name="drag" className="h-4 w-4" strokeWidth={1.7} />
          </button>
          <span className="font-semibold text-ink" data-testid="category-name">
            {category.name}
          </span>
          <span className="text-xs text-muted">{category.products.length} items</span>
        </div>
        <DndContext
          sensors={productSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleProductDragEnd}
        >
          <SortableContext
            items={category.products.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {category.products.map((p) => (
                <SortableProductRow key={p.id} product={p} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </Card>
    </div>
  )
}

/**
 * SC-050 · Menu Display Ordering — School Admin / Staff with Menu
 * Management access (FR-027). Reuses the approved Sc050DisplayOrder.tsx
 * structure — a single screen with nested drag-and-drop: categories at
 * the top level, products within each category nested underneath.
 *
 * Field-reconciliation decision #1: the ticket's own Interaction
 * contract confirms drag-and-drop is a genuine requirement, already
 * investigated pre-G4 — user decision (asked directly): `@dnd-kit`.
 * Decision #2: one "Save order" button fires the category-order PATCH
 * plus one products-order PATCH per category.
 */
export function MenuDisplayOrderScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isStaff = user?.role === 'staff'
  const [categories, setCategories] = useState<CategoryWithProducts[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const categorySensors = useSensors(useSensor(PointerSensor))

  const load = useCallback(() => {
    setError(null)
    listCategories()
      .then(async (result) => {
        const withProducts = await Promise.all(
          result.map(async (category) => ({
            ...category,
            products: await listProductsInCategory(category.id),
          })),
        )
        setCategories(withProducts)
      })
      .catch((err: unknown) => {
        setError(extractErrorMessage(err, 'Something went wrong.'))
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function handleCategoryDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !categories) return
    const oldIndex = categories.findIndex((c) => c.id === active.id)
    const newIndex = categories.findIndex((c) => c.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    setCategories(arrayMove(categories, oldIndex, newIndex))
  }

  function handleProductsReorder(categoryId: string, productIds: string[]) {
    setCategories(
      (prev) =>
        prev?.map((c) =>
          c.id === categoryId
            ? {
                ...c,
                products: productIds
                  .map((id) => c.products.find((p) => p.id === id))
                  .filter((p): p is CategoryProduct => p !== undefined),
              }
            : c,
        ) ?? null,
    )
  }

  async function handleSave() {
    if (!categories) return
    setError(null)
    setIsSaving(true)
    try {
      await reorderCategories(categories.map((c) => c.id))
      await Promise.all(
        categories.map((c) =>
          reorderProductsInCategory(
            c.id,
            c.products.map((p) => p.id),
          ),
        ),
      )
      navigate('/school-admin/products')
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to save the new order.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AppShell
      sidebar={
        isStaff ? (
          <Sidebar
            brandTitle="School24"
            brandSubtitle={user?.school_name ?? undefined}
            groups={staffNavGroups('menu')}
            user={{ initials: initialsOf(user.full_name), name: user.full_name, role: 'Staff' }}
          />
        ) : (
          <Sidebar
            brandTitle="School24"
            brandSubtitle={user?.school_name ?? undefined}
            groups={schoolAdminNavGroups('menu')}
            user={{
              initials: user ? initialsOf(user.full_name) : '',
              name: user?.full_name ?? '',
              role: 'School Admin',
            }}
          />
        )
      }
      topbar={<Topbar right={<IconButton icon="bell" label="Notifications" />} />}
      mobileNav={<MobileTabBar items={isStaff ? staffTabs('menu') : schoolAdminTabs('menu')} />}
    >
      <div className="mx-auto max-w-3xl">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate('/school-admin/products')}
        >
          Products
        </Button>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">Menu display order</h1>
            <p className="mt-0.5 text-sm text-muted">Drag to reorder categories and products.</p>
          </div>
          <Button loading={isSaving} disabled={!categories} onClick={handleSave}>
            Save order
          </Button>
        </div>

        {error && (
          <div className="mt-4">
            <Banner tone="danger">{error}</Banner>
          </div>
        )}

        {categories === null && !error ? (
          <div role="status" aria-label="Loading menu" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <DndContext
            sensors={categorySensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCategoryDragEnd}
          >
            <SortableContext
              items={(categories ?? []).map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="mt-5 space-y-3">
                {(categories ?? []).map((category) => (
                  <SortableCategoryCard
                    key={category.id}
                    category={category}
                    onProductsReorder={handleProductsReorder}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </AppShell>
  )
}
