import { useCallback, useEffect, useState } from 'react'
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
  StatusPill,
  EmptyState,
  ErrorState,
  Icon,
  Spinner,
  type Column,
  type StatusTone,
} from '@/components'
import { listNotifications, type SentLogRow } from '@/features/notifications/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'
import { staffNavGroups, staffTabs } from './staffNav'

const PAGE_SIZE = 20

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function deliveryPill(outcome: SentLogRow['delivery_outcome']): { tone: StatusTone; label: string } {
  if (outcome.failed > 0) return { tone: 'danger', label: `${outcome.failed} failed` }
  if (outcome.pending > 0) return { tone: 'warning', label: 'Delivering…' }
  if (outcome.sent > 0) return { tone: 'success', label: 'Delivered' }
  return { tone: 'neutral', label: 'No recipients' }
}

const ROLE_LABEL: Record<string, string> = { student: 'Students', parent: 'Parents', staff: 'Staff' }

/**
 * SC-089 · Sent Notifications Log — School Admin / Staff with
 * Notification module access (FR-052). Reuses the approved
 * Sc089SentLog.tsx table structure (title/recipients/sent/delivery
 * columns); the approved mock's own row fields don't distinguish
 * manual vs. system notifications (LOCKED 2026-07-01 requirement), so
 * a source Badge is added to the title column without otherwise
 * redesigning the row — see docs/design/field-reconciliation/FR-052.md.
 *
 * "View row details" (design reference) reuses the list's own already-
 * fetched `body` field rather than a separate detail endpoint —
 * expanding a row shows a muted, sender-facing card (no unread dot, no
 * "Mark as read"), the same notification-card building block
 * `Sc091Inbox.tsx`/`InboxScreen.tsx` use for the recipient's own inbox,
 * given a subtly different, non-recipient treatment per the ticket's
 * own explicit instruction.
 */
export function SentLogScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isStaff = user?.role === 'staff'
  const [rows, setRows] = useState<SentLogRow[] | null>(null)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    listNotifications({ page, page_size: PAGE_SIZE })
      .then(({ data, meta }) => {
        setRows(data)
        setTotal(meta.total)
        setTotalPages(meta.total_pages)
      })
      .catch((err: unknown) => {
        setError(extractErrorMessage(err, 'Notifications could not be loaded.'))
      })
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const expandedRow = rows?.find((r) => r.id === expandedId) ?? null

  const columns: Column<SentLogRow>[] = [
    {
      key: 'title',
      header: 'Notification',
      cell: (r) => (
        <span className="inline-flex items-center gap-2">
          <span className="font-medium text-ink">{r.title}</span>
          <Badge tone={r.source === 'system' ? 'info' : 'brand'}>
            {r.source === 'system' ? 'System' : 'Manual'}
          </Badge>
        </span>
      ),
    },
    {
      key: 'recipients',
      header: 'Recipients',
      cell: (r) => (
        <span className="text-muted">
          {r.target_roles.map((role) => ROLE_LABEL[role] ?? role).join(', ')}
        </span>
      ),
    },
    { key: 'sender', header: 'Sender', cell: (r) => <span className="text-muted">{r.sender_name}</span> },
    {
      key: 'sent',
      header: 'Sent',
      cell: (r) => <span className="text-muted">{new Date(r.created_at).toLocaleString()}</span>,
    },
    {
      key: 'status',
      header: 'Delivery',
      cell: (r) => {
        const pill = deliveryPill(r.delivery_outcome)
        return <StatusPill tone={pill.tone} label={pill.label} />
      },
    },
    {
      key: 'open',
      header: <span className="sr-only">Open</span>,
      align: 'right',
      cell: (r) => (
        <button
          type="button"
          aria-label={`View details for ${r.title}`}
          onClick={() => setExpandedId((current) => (current === r.id ? null : r.id))}
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
            groups={staffNavGroups('notifications')}
            user={{ initials: initialsOf(user.full_name), name: user.full_name, role: 'Staff' }}
          />
        ) : (
          <Sidebar
            brandTitle="School24"
            brandSubtitle={user?.school_name ?? undefined}
            groups={schoolAdminNavGroups('notifications')}
            user={{
              initials: user ? initialsOf(user.full_name) : '',
              name: user?.full_name ?? '',
              role: 'School Admin',
            }}
          />
        )
      }
      topbar={<Topbar searchPlaceholder="Search notifications…" right={<IconButton icon="bell" label="Notifications" />} />}
      mobileNav={<MobileTabBar items={isStaff ? staffTabs('notifications') : schoolAdminTabs('notifications')} />}
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">Notifications</h1>
            <p className="mt-0.5 text-sm text-muted">Everything you've sent and how it was delivered.</p>
          </div>
          <Button
            leadingIcon="plus"
            onClick={() => navigate('/school-admin/notifications/new')}
          >
            Compose
          </Button>
        </div>

        {rows === null && !error ? (
          <div role="status" aria-label="Loading notifications" className="mt-10 flex justify-center text-muted">
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
        ) : rows && rows.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon="bell"
              title="No notifications sent yet"
              message="Compose your first message to families and staff."
              action={
                <Button
                  leadingIcon="plus"
                  onClick={() => navigate('/school-admin/notifications/new')}
                >
                  Compose
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            <Card className="mt-5">
              <DataTable columns={columns} rows={rows ?? []} rowKey={(r) => r.id} />
            </Card>

            {expandedRow && (
              <Card className="mt-3 border-l-4 border-l-line bg-canvas/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-line/50 text-muted">
                      <Icon name="bell" className="h-4 w-4" strokeWidth={1.7} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{expandedRow.title}</p>
                      <p className="mt-0.5 text-sm text-muted">{expandedRow.body}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close details"
                    onClick={() => setExpandedId(null)}
                    className="rounded p-1 text-muted hover:bg-line/40"
                  >
                    <Icon name="close" className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </Card>
            )}

            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between text-sm text-muted">
                <span>
                  Page {page} of {totalPages} ({total} total)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
