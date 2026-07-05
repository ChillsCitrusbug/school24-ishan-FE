import { useState, type FormEvent } from 'react'
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
  Checkbox,
  Banner,
} from '@/components'
import { composeNotification, type NotificationTargetRole } from '@/features/notifications/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'
import { staffNavGroups, staffTabs } from './staffNav'

const GROUPS: { key: NotificationTargetRole; label: string }[] = [
  { key: 'parent', label: 'Parents' },
  { key: 'student', label: 'Students' },
  { key: 'staff', label: 'Staff' },
]

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * SC-088 · Compose Notification — School Admin / Staff with
 * Notification access (FR-043). Reuses the approved Sc088Compose.tsx
 * structure; compose and send are ONE action, ONE API call — no draft
 * state, no separate send step (locked interaction contract).
 *
 * Field-reconciliation decision #4: the approved mock's per-group
 * recipient headcounts ("412 people" etc.) have no backing endpoint in
 * this ticket's own scope (only POST/GET /api/v1/notifications are
 * built) — built without fabricated counts; the summary line instead
 * lists the selected role names.
 */
export function ComposeNotificationScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isStaff = user?.role === 'staff'
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<NotificationTargetRole[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function toggleRole(role: NotificationTargetRole) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await composeNotification({ title, body, target_roles: selectedRoles })
      navigate(isStaff ? '/staff' : '/school-admin')
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to send this notification.'))
    } finally {
      setIsSubmitting(false)
    }
  }

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
      topbar={<Topbar searchPlaceholder="Search…" right={<IconButton icon="bell" label="Notifications" />} />}
      mobileNav={<MobileTabBar items={isStaff ? staffTabs('notifications') : schoolAdminTabs('notifications')} />}
    >
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold text-ink">Send a notification</h1>
        <p className="mt-0.5 text-sm text-muted">Message families and staff.</p>

        <Card className="mt-5 p-5">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && <Banner tone="danger">{error}</Banner>}
            <Field label="Title">
              <Input
                placeholder="e.g. Canteen closed Friday"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <div>
              <div className="mb-1.5 text-sm font-medium text-ink">Message</div>
              <textarea
                rows={4}
                aria-label="Message"
                placeholder="Write your message…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted/80 focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>

            <div>
              <div className="mb-1.5 text-sm font-medium text-ink">Send to</div>
              <div className="divide-y divide-line rounded-card border border-line">
                {GROUPS.map((g) => (
                  <div key={g.key} className="flex items-center gap-3 px-3 py-2.5">
                    <Checkbox
                      label={g.label}
                      checked={selectedRoles.includes(g.key)}
                      onChange={() => toggleRole(g.key)}
                    />
                    <span className="text-sm text-ink">{g.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedRoles.length === 0 ? (
              <Banner tone="warning">Select at least one recipient group to send.</Banner>
            ) : (
              <p className="text-sm text-muted">
                Sending to{' '}
                <b className="text-ink">
                  {GROUPS.filter((g) => selectedRoles.includes(g.key))
                    .map((g) => g.label)
                    .join(', ')}
                </b>
                .
              </p>
            )}

            <Button
              type="submit"
              fullWidth
              leadingIcon="bell"
              loading={isSubmitting}
              disabled={selectedRoles.length === 0 || !title.trim() || !body.trim()}
            >
              Send notification
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  )
}
