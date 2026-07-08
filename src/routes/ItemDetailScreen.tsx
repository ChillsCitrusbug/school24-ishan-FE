import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  Button,
  Card,
  QtyStepper,
  Badge,
  Icon,
  Banner,
  ErrorState,
  Spinner,
} from '@/components'
import { cn } from '@/lib/cn'
import { useStudentAuth } from '@/features/student-auth/useStudentAuth'
import {
  getMenuProduct,
  getMenuCombo,
  type MenuProductDetail,
  type MenuComboDetail,
} from '@/features/menu-browse/api'
import { addCartItem } from '@/features/cart/api'
import { extractErrorMessage } from '@/lib/api-error'
import { studentNavGroups, studentTabs } from './studentNav'

type Detail = MenuProductDetail | MenuComboDetail

function isProduct(detail: Detail): detail is MenuProductDetail {
  return detail.item_type === 'product'
}

function isCombo(detail: Detail): detail is MenuComboDetail {
  return detail.item_type === 'combo'
}

/**
 * SC-072 · Product / Combo Detail with Variant Selection (enforce:
 * block on add) — Student (FR-035). Reuses the approved
 * Sc072ProductDetail.tsx structure for both products (with a required
 * size/variant picker, only rendered when the product actually has
 * any — FR-024's own variants are optional) and combos (no variant
 * concept, per the DBML — just quantity + Add).
 */
export function ItemDetailScreen({ itemType }: { itemType: 'product' | 'combo' }) {
  const { student } = useStudentAuth()
  const navigate = useNavigate()
  const params = useParams<{ productId?: string; comboId?: string }>()
  const itemId = itemType === 'product' ? params.productId : params.comboId
  const studentId = student?.id ?? ''

  const [detail, setDetail] = useState<Detail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [variantId, setVariantId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [actionError, setActionError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!studentId || !itemId) return
    const load = itemType === 'product' ? getMenuProduct(studentId, itemId) : getMenuCombo(studentId, itemId)
    load
      .then((result) => setDetail(result))
      .catch((err: unknown) => {
        setLoadError(extractErrorMessage(err, 'This item could not be loaded.'))
      })
  }, [studentId, itemId, itemType])

  if (loadError) {
    return (
      <AppShell
        sidebar={<Sidebar brandTitle="School24" groups={studentNavGroups('menu')} user={{ initials: '', name: student?.full_name ?? '', role: 'Student' }} />}
        topbar={<Topbar />}
        mobileNav={<MobileTabBar items={studentTabs('menu')} />}
      >
        <div className="mx-auto max-w-2xl">
          <Card className="p-6">
            <ErrorState message={loadError} />
          </Card>
        </div>
      </AppShell>
    )
  }

  if (!detail) {
    return (
      <AppShell
        sidebar={<Sidebar brandTitle="School24" groups={studentNavGroups('menu')} user={{ initials: '', name: student?.full_name ?? '', role: 'Student' }} />}
        topbar={<Topbar />}
        mobileNav={<MobileTabBar items={studentTabs('menu')} />}
      >
        <div role="status" aria-label="Loading item" className="mt-10 flex justify-center text-muted">
          <Spinner className="h-6 w-6" />
        </div>
      </AppShell>
    )
  }

  const variants = isProduct(detail) ? detail.variants : []
  const needsVariant = variants.length > 0
  const showErr = needsVariant && variantId === null
  const unitPrice = needsVariant
    ? Number(variants.find((v) => v.id === variantId)?.price ?? 0)
    : Number(detail.base_price)

  async function handleAdd() {
    if (!detail || detail.blocked || showErr) return
    setAdding(true)
    setActionError(null)
    try {
      await addCartItem(studentId, {
        item_type: detail.item_type,
        quantity,
        ...(detail.item_type === 'product'
          ? { product_id: detail.id, ...(variantId ? { variant_id: variantId } : {}) }
          : { combo_id: detail.id }),
      })
      navigate('/student/cart')
    } catch (err) {
      setActionError(extractErrorMessage(err, 'Could not add this item. Please try again.'))
    } finally {
      setAdding(false)
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
      topbar={<Topbar searchPlaceholder="Search the menu…" />}
      mobileNav={<MobileTabBar items={studentTabs('menu')} />}
    >
      <div className="mx-auto max-w-2xl">
        <Button variant="ghost" size="sm" leadingIcon="chevronLeft" className="mb-3" onClick={() => navigate('/student/menu')}>
          Menu
        </Button>

        <Card className="overflow-hidden">
          <div
            className="relative h-48"
            style={{ background: 'linear-gradient(135deg,#d49a6a,#a86a3c)' }}
          >
            {detail.blocked && (
              <div className="absolute inset-0 grid place-items-center bg-ink/55 text-sm font-medium text-white">
                <span className="flex items-center gap-1.5">
                  <Icon name="shield" className="h-5 w-5" /> Blocked by a parent
                </span>
              </div>
            )}
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-ink">{detail.name}</h1>
                {detail.description && <p className="text-sm text-muted">{detail.description}</p>}
              </div>
              {detail.item_type === 'combo' && <Badge tone="accent">Combo</Badge>}
            </div>

            {detail.blocked && (
              <div className="mt-4 flex items-center gap-2 rounded-control border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
                <Icon name="shield" className="h-4 w-4" />
                {detail.block_reason ?? "A parent has restricted this item, so it can't be added."}
              </div>
            )}

            {isCombo(detail) && (
              <div className="mt-4">
                <div className="mb-2 text-sm font-medium text-ink">Includes</div>
                <ul className="space-y-1 text-sm text-muted">
                  {detail.included_products.map((p) => (
                    <li key={p.id}>{p.name}</li>
                  ))}
                </ul>
              </div>
            )}

            {needsVariant && (
              <div className="mt-5">
                <div id="size-label" className="mb-2 text-sm font-medium text-ink">
                  Choose a size
                </div>
                <div role="radiogroup" aria-labelledby="size-label" className="flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      role="radio"
                      aria-checked={variantId === v.id}
                      onClick={() => setVariantId(v.id)}
                      disabled={detail.blocked}
                      className={cn(
                        'rounded-control border px-4 py-2 text-sm font-medium transition disabled:opacity-50',
                        variantId === v.id
                          ? 'border-brand bg-brand/10 text-brand-deep'
                          : 'border-line text-ink hover:bg-canvas',
                      )}
                    >
                      {v.label} · ${Number(v.price).toFixed(2)}
                    </button>
                  ))}
                </div>
                {showErr && !detail.blocked && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-danger">
                    <Icon name="alert" className="h-4 w-4" /> Please choose a size to continue.
                  </p>
                )}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between">
              <span className="text-sm font-medium text-ink">Quantity</span>
              <QtyStepper value={quantity} onChange={setQuantity} />
            </div>

            {actionError && (
              <div className="mt-4">
                <Banner tone="danger">{actionError}</Banner>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-line p-4">
            <div>
              <div className="text-xs text-muted">Total</div>
              <div className="text-lg font-bold text-brand-deep">${(unitPrice * quantity).toFixed(2)}</div>
            </div>
            <Button leadingIcon="plus" disabled={detail.blocked || showErr} loading={adding} onClick={handleAdd}>
              Add to cart
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
