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
  Toggle,
  EmptyState,
  ErrorState,
  Icon,
  Spinner,
  type Column,
} from '@/components'
import { listCombos, type Combo } from '@/features/combos/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
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
 * SC-048 · Menu — Combos List (+ availability toggle) — School Admin /
 * Staff with Menu Management access (FR-025). Reuses the approved
 * Sc048Combos.tsx structure/components as-is.
 *
 * Field-reconciliation decision #6: the availability Toggle is FR-026's
 * own scope — rendered per the approved design but inert (disabled)
 * until that ticket ships, same "inert until that ticket ships"
 * convention FR-024 already established for its own Toggle/Arrange
 * controls. Decision #7: the "Includes" column joins bundled product
 * names with " + ", matching the mock's own literal display.
 */
export function CombosListScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [combos, setCombos] = useState<Combo[] | null>(null)
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
    listCombos()
      .then((result) => {
        if (mountedRef.current) setCombos(result)
      })
      .catch((err: unknown) => {
        if (mountedRef.current) setError(extractErrorMessage(err, 'Something went wrong.'))
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const columns: Column<Combo>[] = [
    {
      key: 'name',
      header: 'Combo',
      cell: (c) => <span className="font-medium text-ink">{c.name}</span>,
    },
    {
      key: 'items',
      header: 'Includes',
      cell: (c) => <span className="text-muted">{c.products.map((p) => p.name).join(' + ')}</span>,
    },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      cell: (c) => <span className="font-medium text-ink">${c.combo_price}</span>,
    },
    {
      key: 'available',
      header: 'Available',
      cell: (c) => (
        <span className="inline-flex items-center gap-2">
          <Toggle label={`${c.name} available`} checked={c.availability_status === 'available'} />
          <span className="text-xs text-muted">
            {c.availability_status === 'available' ? 'On menu' : 'Hidden'}
          </span>
        </span>
      ),
    },
    {
      key: 'open',
      header: <span className="sr-only">Edit</span>,
      align: 'right',
      cell: (c) => (
        <button
          type="button"
          aria-label={`Edit ${c.name}`}
          onClick={() => navigate(`/school-admin/combos/${c.id}/edit`)}
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
          searchPlaceholder="Search combos…"
          right={<IconButton icon="bell" label="Notifications" />}
        />
      }
      mobileNav={<MobileTabBar items={isStaff ? staffTabs('menu') : schoolAdminTabs('menu')} />}
    >
      <div className="mx-auto max-w-5xl">
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
            <h1 className="text-2xl font-bold text-ink">Menu — combos</h1>
            <p className="mt-0.5 text-sm text-muted">Bundle products at a combo price.</p>
          </div>
          <Button leadingIcon="plus" onClick={() => navigate('/school-admin/combos/new')}>
            Add combo
          </Button>
        </div>

        {combos === null && !error ? (
          <div role="status" aria-label="Loading combos" className="mt-10 flex justify-center text-muted">
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
        ) : combos && combos.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon="order"
              title="No combos yet"
              message="Bundle a few products together at a special price."
              action={
                <Button leadingIcon="plus" onClick={() => navigate('/school-admin/combos/new')}>
                  Add combo
                </Button>
              }
            />
          </Card>
        ) : (
          <Card className="mt-5">
            <DataTable columns={columns} rows={combos ?? []} rowKey={(c) => c.id} />
          </Card>
        )}
      </div>
    </AppShell>
  )
}
