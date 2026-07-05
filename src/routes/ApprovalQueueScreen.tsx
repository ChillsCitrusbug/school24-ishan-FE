import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  Button,
  Banner,
  Card,
  Avatar,
  EmptyState,
  ErrorState,
  Spinner,
} from '@/components'
import {
  decideLinkRequest,
  listPendingLinkRequests,
  type PendingLinkRequest,
} from '@/features/approvals/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'
import { staffNavGroups, staffTabs } from './staffNav'

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * SC-043 · Parent-Student Link Approval Queue — School Admin / Staff
 * with Approval Module access (FR-020). Reuses the approved
 * Sc043ApprovalQueue.tsx structure. "Approve" acts immediately from
 * the list (matching the mock's own plain inline button, no extra
 * state); "Reject" navigates to the per-request review screen
 * (Sc044LinkReview.tsx) with its reject-confirm sub-state pre-selected,
 * since that's the only place a rejection reason can be captured —
 * the queue's own row never exposes a reason field itself.
 */
export function ApprovalQueueScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<PendingLinkRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
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
    listPendingLinkRequests()
      .then((result) => {
        if (mountedRef.current) setRequests(result)
      })
      .catch((err: unknown) => {
        if (mountedRef.current) setError(extractErrorMessage(err, 'Something went wrong.'))
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleApprove(request: PendingLinkRequest) {
    if (pendingIds.has(request.id)) return
    setActionError(null)
    setPendingIds((prev) => new Set(prev).add(request.id))
    try {
      await decideLinkRequest(request.id, 'approve')
      setRequests((prev) => prev?.filter((r) => r.id !== request.id) ?? prev)
    } catch (err) {
      setActionError(extractErrorMessage(err, 'This request could not be approved.'))
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(request.id)
        return next
      })
    }
  }

  return (
    <AppShell
      sidebar={
        isStaff ? (
          <Sidebar
            brandTitle="School24"
            brandSubtitle={user?.school_name ?? undefined}
            groups={staffNavGroups('approvals')}
            user={{ initials: initialsOf(user.full_name), name: user.full_name, role: 'Staff' }}
          />
        ) : (
          <Sidebar
            brandTitle="School24"
            brandSubtitle={user?.school_name ?? undefined}
            groups={schoolAdminNavGroups('approvals')}
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
          searchPlaceholder="Search requests…"
          right={<IconButton icon="bell" label="Notifications" />}
        />
      }
      mobileNav={
        <MobileTabBar items={isStaff ? staffTabs('approvals') : schoolAdminTabs('approvals')} />
      }
    >
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-ink">Link approvals</h1>
        <p className="mt-0.5 text-sm text-muted">Review parent requests to link to a student.</p>

        {actionError && (
          <div className="mt-4">
            <Banner tone="danger">{actionError}</Banner>
          </div>
        )}

        {requests === null && !error ? (
          <div role="status" aria-label="Loading requests" className="mt-10 flex justify-center text-muted">
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
        ) : requests && requests.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon="check"
              title="No pending requests"
              message="You're all caught up. New link requests will appear here."
            />
          </Card>
        ) : (
          <Card className="mt-5 divide-y divide-line">
            {(requests ?? []).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => navigate(`/school-admin/approvals/${r.id}`)}
                >
                  <Avatar initials={initialsOf(r.parent_name)} tone="brand" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink">{r.parent_name}</div>
                    <div className="text-xs text-muted">
                      wants to link to <b className="text-ink">{r.student_name}</b> · {r.class_name}
                    </div>
                  </div>
                </button>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/school-admin/approvals/${r.id}?action=reject`)}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    loading={pendingIds.has(r.id)}
                    onClick={() => handleApprove(r)}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </AppShell>
  )
}
