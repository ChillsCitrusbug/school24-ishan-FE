import { useEffect, useState } from 'react'
import { AppShell, Card, EmptyState, ErrorState, Icon, MobileTabBar, Sidebar, Spinner, Topbar } from '@/components'
import { listMyNotifications, type InboxNotification } from '@/features/notifications/api'
import { extractErrorMessage } from '@/lib/api-error'
import { parentNavGroups, parentTabs } from './parentNav'
import { staffNavGroups, staffTabs } from './staffNav'
import { studentNavGroups, studentTabs } from './studentNav'

/**
 * Sc091Inbox.tsx — a recipient (Parent/Staff/Student) sees every
 * notification delivered to them (FR-044).
 *
 * Field-reconciliation decision #6: the mock's own "unread" dot/
 * highlight and "Mark all read" button have no backing schema field
 * (`NotificationRecipient` has no `read_at`/`is_read` column, and this
 * ticket's own DoD never asks for one) — omitted here rather than
 * shipping a decorative, non-functional control, same judgment as the
 * ticket's own already-applied delta for Sc090's delivered/failed
 * counts.
 *
 * Round-2 review, Minor finding: the sidebar's own identity was
 * hardcoded blank regardless of caller. `displayName`/`roleLabel` are
 * now accepted as props, matching `WalletScreen.tsx`'s own established
 * shared-component-plus-thin-wrapper reuse pattern (FR-031) — each of
 * the 3 role-specific wrappers below resolves its own auth context and
 * passes its own identity through.
 */
export interface InboxScreenProps {
  role: 'parent' | 'staff' | 'student'
  displayName: string
  roleLabel: string
}

export function InboxScreen({ role, displayName, roleLabel }: InboxScreenProps) {
  const [notifications, setNotifications] = useState<InboxNotification[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listMyNotifications()
      .then(setNotifications)
      .catch((err: unknown) => {
        setError(extractErrorMessage(err, 'Notifications could not be loaded.'))
      })
  }, [])

  const navGroups =
    role === 'parent' ? parentNavGroups() : role === 'staff' ? staffNavGroups('notifications') : studentNavGroups()
  const tabs = role === 'parent' ? parentTabs() : role === 'staff' ? staffTabs('notifications') : studentTabs()

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={navGroups}
          user={{ initials: displayName.slice(0, 1).toUpperCase(), name: displayName, role: roleLabel }}
        />
      }
      topbar={<Topbar />}
      mobileNav={<MobileTabBar items={tabs} />}
    >
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-ink">Notifications</h1>
        <p className="mt-0.5 text-sm text-muted">Updates about orders, your children and the school.</p>

        {error ? (
          <Card className="mt-6">
            <ErrorState message={error} />
          </Card>
        ) : notifications === null ? (
          <div role="status" aria-label="Loading notifications" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : notifications.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon="bell"
              title="You're all caught up"
              message="Notifications about orders and your children will appear here."
            />
          </Card>
        ) : (
          <Card className="mt-5 divide-y divide-line">
            {notifications.map((n) => (
              <div key={n.notification_id} className="flex gap-3 px-5 py-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-mint text-brand">
                  <Icon name="bell" className="h-4 w-4" strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{n.title}</span>
                    <span className="ml-auto whitespace-nowrap text-xs text-muted">
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{n.body}</p>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </AppShell>
  )
}
