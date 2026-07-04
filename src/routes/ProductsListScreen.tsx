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
  DataTable,
  Badge,
  Toggle,
  EmptyState,
  ErrorState,
  Icon,
  Spinner,
  type Column,
} from '@/components'
import { listProducts, type Product } from '@/features/products/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'
import { staffNavGroups, staffTabs } from './staffNav'

const CATEGORY_TONES: Array<'brand' | 'accent' | 'success' | 'info'> = [
  'brand',
  'accent',
  'success',
  'info',
]

function toneForCategory(name: string | null): 'brand' | 'accent' | 'success' | 'info' | 'neutral' {
  if (!name) return 'neutral'
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return CATEGORY_TONES[hash % CATEGORY_TONES.length]
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * SC-046 · Menu — Products List — School Admin / Staff with Menu
 * Management access (FR-024). Reuses the approved Sc046Products.tsx
 * structure/components as-is.
 *
 * Field-reconciliation decision #10: the mock hardcodes the School
 * Admin's own nav context even though the ticket covers Staff too —
 * the nav shell here is picked at render time from `user.role`.
 * Decision #11: the availability Toggle and "Arrange" button are
 * FR-026/FR-027's own scope — rendered per the approved design but
 * inert (disabled) until those tickets ship.
 */
export function ProductsListScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const isStaff = user?.role === 'staff'

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const load = useCallback(() => {
    setError(null)
    listProducts()
      .then((result) => {
        if (mountedRef.current) setProducts(result)
      })
      .catch((err: unknown) => {
        if (mountedRef.current) setError(extractErrorMessage(err, 'Something went wrong.'))
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      cell: (p) => <span className="font-medium text-ink">{p.name}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      cell: (p) => <Badge tone={toneForCategory(p.category_name)}>{p.category_name ?? '—'}</Badge>,
    },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      cell: (p) => <span className="font-medium text-ink">${p.base_price}</span>,
    },
    {
      key: 'available',
      header: 'Available',
      cell: (p) => (
        <span className="inline-flex items-center gap-2">
          <Toggle
            label={`${p.name} available`}
            checked={p.availability_status === 'available'}
          />
          <span className="text-xs text-muted">
            {p.availability_status === 'available' ? 'On menu' : 'Hidden'}
          </span>
        </span>
      ),
    },
    {
      key: 'open',
      header: <span className="sr-only">Edit</span>,
      align: 'right',
      cell: (p) => (
        <button
          type="button"
          aria-label={`Edit ${p.name}`}
          onClick={() => navigate(`/school-admin/products/${p.id}/edit`)}
          className="rounded p-1 hover:bg-canvas"
        >
          <Icon name="chevronRight" className="h-4 w-4 text-muted" strokeWidth={2} />
        </button>
      ),
    },
  ]

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
      topbar={
        <Topbar
          searchPlaceholder="Search the menu…"
          right={<IconButton icon="bell" label="Notifications" />}
        />
      }
      mobileNav={<MobileTabBar items={isStaff ? staffTabs('menu') : schoolAdminTabs('menu')} />}
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">Menu — products</h1>
            <p className="mt-0.5 text-sm text-muted">Toggle availability or edit any item.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" leadingIcon="drag" disabled>
              Arrange
            </Button>
            <Button leadingIcon="plus" onClick={() => navigate('/school-admin/products/new')}>
              Add product
            </Button>
          </div>
        </div>

        {products === null && !error ? (
          <div role="status" aria-label="Loading products" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : error ? (
          <Card className="mt-6">
            <ErrorState
              message={error}
              action={
                <Button variant="secondary" onClick={load}>
                  Try again
                </Button>
              }
            />
          </Card>
        ) : products && products.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon="order"
              title="No products yet"
              message="Add your first product, then build combos from it."
              action={
                <Button leadingIcon="plus" onClick={() => navigate('/school-admin/products/new')}>
                  Add product
                </Button>
              }
            />
          </Card>
        ) : (
          <Card className="mt-5">
            <DataTable columns={columns} rows={products ?? []} rowKey={(p) => p.id} />
          </Card>
        )}
      </div>
    </AppShell>
  )
}
