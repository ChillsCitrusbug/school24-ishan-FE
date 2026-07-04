import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  Button,
  Card,
  Field,
  Input,
  Checkbox,
  Banner,
  EmptyState,
  Spinner,
} from '@/components'
import { createCombo, getCombo, updateCombo } from '@/features/combos/api'
import { listProducts, type Product } from '@/features/products/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/cn'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'
import { staffNavGroups, staffTabs } from './staffNav'

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * SC-049 · Create / Edit Combo form — School Admin / Staff with Menu
 * Management access (FR-025). Reuses the approved Sc049ComboForm.tsx
 * structure for BOTH create and edit, matching how ClassFormScreen.tsx/
 * StaffFormScreen.tsx already handle the same "one shared form
 * component" shape.
 *
 * Field-reconciliation decision #5: the "blocked: no products in the
 * catalogue" state is a purely frontend conditional render (once the
 * product list loads empty) — no backend flag drives it.
 */
export function ComboFormScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { comboId } = useParams<{ comboId?: string }>()
  const isEditMode = Boolean(comboId)
  const isStaff = user?.role === 'staff'
  const [name, setName] = useState('')
  const [comboPrice, setComboPrice] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const loaders: Promise<unknown>[] = [
      listProducts().then((result) => {
        if (!cancelled) setProducts(result)
      }),
    ]
    if (comboId) {
      loaders.push(
        getCombo(comboId).then((result) => {
          if (!cancelled) {
            setName(result.name)
            setComboPrice(result.combo_price)
            setSelectedProductIds(result.products.map((p) => p.id))
          }
        }),
      )
    }
    Promise.all(loaders)
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(extractErrorMessage(err, 'This combo could not be found.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [comboId])

  function toggleProduct(productId: string) {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const input = { name, combo_price: comboPrice, product_ids: selectedProductIds }
      if (isEditMode && comboId) {
        await updateCombo(comboId, input)
      } else {
        await createCombo(input)
      }
      navigate('/school-admin/combos')
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to save this combo.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const sidebar = isStaff ? (
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

  const shellProps = {
    sidebar,
    topbar: <Topbar right={<IconButton icon="bell" label="Notifications" />} />,
    mobileNav: <MobileTabBar items={isStaff ? staffTabs('menu') : schoolAdminTabs('menu')} />,
  }

  if (!isLoading && !loadError && products && products.length === 0) {
    return (
      <AppShell {...shellProps}>
        <div className="mx-auto max-w-lg">
          <Button
            variant="ghost"
            size="sm"
            leadingIcon="chevronLeft"
            className="mb-3"
            onClick={() => navigate('/school-admin/combos')}
          >
            Combos
          </Button>
          <Card>
            <EmptyState
              icon="order"
              title="Add products first"
              message="A combo bundles existing products. Add at least one product before creating a combo."
              action={
                <Button leadingIcon="plus" onClick={() => navigate('/school-admin/products/new')}>
                  Add a product
                </Button>
              }
            />
          </Card>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell {...shellProps}>
      <div className="mx-auto max-w-lg">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate('/school-admin/combos')}
        >
          Combos
        </Button>

        {isLoading ? (
          <div role="status" aria-label="Loading" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : loadError ? (
          <Card className="p-5">
            <Banner tone="danger">{loadError}</Banner>
          </Card>
        ) : (
          <Card className="p-5">
            <h1 className="text-xl font-bold text-ink">
              {isEditMode ? 'Edit combo' : 'Create a combo'}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Pick the products to bundle and set a combo price.
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              {error && <Banner tone="danger">{error}</Banner>}
              <Field label="Combo name">
                <Input
                  placeholder="e.g. Lunch Box"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Field>

              <div>
                <div className="mb-1.5 text-sm font-medium text-ink">
                  Products ({selectedProductIds.length} selected)
                </div>
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-card border border-line p-2">
                  {(products ?? []).map((p) => {
                    const on = selectedProductIds.includes(p.id)
                    return (
                      <div
                        key={p.id}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-control px-2 py-2 transition',
                          on ? 'bg-brand/5' : '',
                        )}
                      >
                        <Checkbox label={p.name} checked={on} onChange={() => toggleProduct(p.id)} />
                        <span className="flex-1 text-sm text-ink">{p.name}</span>
                        <span className="text-sm text-muted">${p.base_price}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <Field label="Combo price" hint="Usually a discount on the total.">
                <Input
                  placeholder="$0.00"
                  value={comboPrice}
                  onChange={(e) => setComboPrice(e.target.value)}
                  required
                />
              </Field>

              <div className="flex gap-2">
                <Button type="submit" loading={isSubmitting} disabled={selectedProductIds.length === 0}>
                  Save combo
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/school-admin/combos')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
