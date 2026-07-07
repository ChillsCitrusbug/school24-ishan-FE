import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Select,
  SegmentedControl,
  DataTable,
  StatusPill,
  EmptyState,
  ErrorState,
  Spinner,
  Icon,
  type Column,
  type StatusTone,
} from '@/components'
import { useAuth } from '@/features/auth/useAuth'
import { listAdminOrders, type AdminOrderFilters, type OrderStatus, type StaffOrderSummary } from '@/features/orders/api'
import { extractErrorMessage } from '@/lib/api-error'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready']

// Round-1 review, Major finding: quick-filter statuses are now sent to
// the BACKEND (repeated `status` query params), not filtered
// client-side out of a single fetched page — the previous version
// silently missed rows beyond page 1 and misreported the total.
const FILTER_TO_STATUSES: Record<string, OrderStatus[] | undefined> = {
  all: undefined,
  active: ACTIVE_STATUSES,
  completed: ['completed'],
  cancelled: ['cancelled'],
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_TONE: Record<OrderStatus, StatusTone> = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'info',
  ready: 'success',
  completed: 'success',
  cancelled: 'accent',
}

const PAGE_SIZE = 20

type SortBy = 'placed_at' | 'total_amount' | 'status' | 'student_name'

/**
 * SC-084 · School Admin — All Orders Management List (FR-042).
 * Reuses the approved Sc084AllOrders.tsx structure for the quick-
 * filter/table layout. The mock's own "Refunded" segment is replaced
 * with "Cancelled" (no REFUNDED status exists anywhere in this
 * schema). Round-1 review, Major finding: the ticket's own DoD names
 * date-range/student-name/parent-name filters, sorting, and
 * pagination as required capabilities of the admin list endpoint —
 * the mock itself has no controls for these (its own fixture data is
 * small enough not to need them), but the ticket's own written DoD is
 * the authoritative spec, so a real filter bar + sort + pagination
 * controls are added here, beyond the mock's own literal structure.
 *
 * Round-2 review, Major finding: an earlier version of this filter bar
 * fired a fresh request on every keystroke in the name/date inputs
 * (`load()` depended on the raw input state directly), with no
 * debounce and no stale-response guard — up to one request per
 * character typed, and a genuine risk of an OLDER response overwriting
 * a NEWER one's results. Fixed by splitting each input into its own
 * "draft" state (bound to the `<input>`, updated per keystroke) and a
 * separate "applied" state that `load()` actually depends on — the
 * applied state only changes on the form's own explicit Search submit,
 * so the Search button's own visual promise ("nothing happens until
 * you press this") is now literally true, and at most one request
 * fires per submit.
 */
export function AllOrdersScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [quickFilter, setQuickFilter] = useState('all')
  const [dateFromDraft, setDateFromDraft] = useState('')
  const [dateToDraft, setDateToDraft] = useState('')
  const [studentNameDraft, setStudentNameDraft] = useState('')
  const [parentNameDraft, setParentNameDraft] = useState('')
  const [appliedDateFrom, setAppliedDateFrom] = useState('')
  const [appliedDateTo, setAppliedDateTo] = useState('')
  const [appliedStudentName, setAppliedStudentName] = useState('')
  const [appliedParentName, setAppliedParentName] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('placed_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<StaffOrderSummary[] | null>(null)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(() => {
    const filters: AdminOrderFilters = {
      page,
      page_size: PAGE_SIZE,
      sort_by: sortBy,
      sort_dir: sortDir,
    }
    const statuses = FILTER_TO_STATUSES[quickFilter]
    if (statuses) filters.status = statuses
    if (appliedDateFrom) filters.date_from = appliedDateFrom
    if (appliedDateTo) filters.date_to = appliedDateTo
    if (appliedStudentName) filters.student_name = appliedStudentName
    if (appliedParentName) filters.parent_name = appliedParentName

    listAdminOrders(filters)
      .then(({ rows: fetched, meta }) => {
        setRows(fetched)
        setTotal(meta.total)
        setTotalPages(meta.total_pages)
        setLoadError(null)
      })
      .catch((err: unknown) => {
        setLoadError(extractErrorMessage(err, 'Something went wrong.'))
      })
  }, [
    quickFilter,
    appliedDateFrom,
    appliedDateTo,
    appliedStudentName,
    appliedParentName,
    sortBy,
    sortDir,
    page,
  ])

  useEffect(() => {
    load()
  }, [load])

  function handleQuickFilterChange(value: string) {
    setQuickFilter(value)
    setPage(1)
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault()
    setAppliedDateFrom(dateFromDraft)
    setAppliedDateTo(dateToDraft)
    setAppliedStudentName(studentNameDraft)
    setAppliedParentName(parentNameDraft)
    setPage(1)
  }

  const columns: Column<StaffOrderSummary>[] = [
    { key: 'id', header: 'Order', cell: (r) => <span className="font-mono text-xs text-muted">{r.display_id}</span> },
    {
      key: 'student',
      header: 'Student',
      cell: (r) => (
        <span>
          <span className="font-medium text-ink">{r.student_name}</span>{' '}
          {r.class_label && <span className="text-xs text-muted">· {r.class_label}</span>}
        </span>
      ),
    },
    { key: 'total', header: 'Total', align: 'right', cell: (r) => <span className="font-medium text-ink">${r.total_amount}</span> },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <StatusPill tone={STATUS_TONE[r.status]} label={STATUS_LABEL[r.status]} />,
    },
    { key: 'time', header: 'Time', cell: (r) => <span className="text-muted">{new Date(r.placed_at).toLocaleString()}</span> },
    {
      key: 'open',
      header: <span className="sr-only">Open</span>,
      align: 'right',
      cell: (r) => (
        <button
          type="button"
          aria-label={`Open order ${r.display_id}`}
          onClick={() => navigate(`/school-admin/orders/${r.id}`)}
        >
          <Icon name="chevronRight" className="h-4 w-4 text-muted" strokeWidth={2} />
        </button>
      ),
    },
  ]

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          brandSubtitle={user?.school_name ?? undefined}
          groups={schoolAdminNavGroups('allOrders')}
          user={{
            initials: user ? initialsOf(user.full_name) : '',
            name: user?.full_name ?? '',
            role: 'School Admin',
          }}
        />
      }
      topbar={<Topbar searchPlaceholder="Search orders…" right={<IconButton icon="bell" label="Notifications" />} />}
      mobileNav={<MobileTabBar items={schoolAdminTabs('allOrders')} />}
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">All orders</h1>
            <p className="mt-0.5 text-sm text-muted">Every order across the canteen.</p>
          </div>
          <Button variant="secondary" leadingIcon="export" onClick={() => navigate('/school-admin/orders/export')}>
            Export
          </Button>
        </div>

        <div className="mt-5 overflow-x-auto pb-1">
          <SegmentedControl
            ariaLabel="Filter orders"
            value={quickFilter}
            onChange={handleQuickFilterChange}
            segments={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
        </div>

        <form onSubmit={handleSearchSubmit} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Field label="From">
            <Input type="date" value={dateFromDraft} onChange={(e) => setDateFromDraft(e.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={dateToDraft} onChange={(e) => setDateToDraft(e.target.value)} />
          </Field>
          <Field label="Student name">
            <Input
              value={studentNameDraft}
              onChange={(e) => setStudentNameDraft(e.target.value)}
              placeholder="Search…"
            />
          </Field>
          <Field label="Parent name">
            <Input
              value={parentNameDraft}
              onChange={(e) => setParentNameDraft(e.target.value)}
              placeholder="Search…"
            />
          </Field>
          <Field label="Sort by">
            <Select
              value={`${sortBy}:${sortDir}`}
              onChange={(e) => {
                const [by, dir] = e.target.value.split(':') as [SortBy, 'asc' | 'desc']
                setSortBy(by)
                setSortDir(dir)
                setPage(1)
              }}
            >
              <option value="placed_at:desc">Newest first</option>
              <option value="placed_at:asc">Oldest first</option>
              <option value="total_amount:desc">Total (high to low)</option>
              <option value="total_amount:asc">Total (low to high)</option>
              <option value="student_name:asc">Student name (A–Z)</option>
            </Select>
          </Field>
          <Button type="submit" variant="secondary" className="col-span-2 sm:col-span-5 sm:w-auto">
            Search
          </Button>
        </form>

        {loadError ? (
          <Card className="mt-4">
            <ErrorState message={loadError} action={<button onClick={load}>Try again</button>} />
          </Card>
        ) : rows === null ? (
          <Card className="mt-4 flex justify-center p-8">
            <Spinner />
          </Card>
        ) : rows.length === 0 ? (
          <Card className="mt-4">
            <EmptyState icon="order" title="No orders yet" message="Orders placed by families will appear here." />
          </Card>
        ) : (
          <Card className="mt-4">
            <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />
            <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm text-muted">
              <span>
                Showing page {page} of {totalPages || 1} · {total} orders
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
