import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  Button,
  Banner,
  Card,
  StatusPill,
  InfoRow,
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
 * SC-044 · Link Request Review / Decision — School Admin / Staff with
 * Approval Module access (FR-020). Reuses the approved Sc044LinkReview.tsx
 * structure, including its own reject-confirm sub-state (optional
 * reason textarea) — the only place a rejection reason can be entered.
 * `?action=reject` (set by the queue's own "Reject" button) opens
 * straight into that sub-state; otherwise the screen opens on the
 * default Approve/Reject choice.
 *
 * There is no dedicated `GET /api/v1/approvals/parent-links/{id}`
 * endpoint (out of the ticket's own literal DoD, which only names the
 * list and PATCH endpoints) — this screen finds its own request inside
 * the already-built pending-list response, matching the list screen's
 * own data instead of adding a new read endpoint for a single detail
 * view of data already fully returned by the list.
 */
export function LinkRequestReviewScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { linkId } = useParams<{ linkId: string }>()
  const [searchParams] = useSearchParams()
  const [request, setRequest] = useState<PendingLinkRequest | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showRejectConfirm, setShowRejectConfirm] = useState(searchParams.get('action') === 'reject')
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isStaff = user?.role === 'staff'

  useEffect(() => {
    if (!linkId) return
    let cancelled = false
    listPendingLinkRequests()
      .then((results) => {
        if (cancelled) return
        const match = results.find((r) => r.id === linkId)
        if (!match) {
          setLoadError('This request is no longer pending, or does not belong to your school.')
          return
        }
        setRequest(match)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(extractErrorMessage(err, 'This request could not be found.'))
      })
    return () => {
      cancelled = true
    }
  }, [linkId])

  async function handleApprove() {
    if (!linkId) return
    setError(null)
    setIsSubmitting(true)
    try {
      await decideLinkRequest(linkId, 'approve')
      navigate('/school-admin/approvals', { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err, 'This request could not be approved.'))
      setIsSubmitting(false)
    }
  }

  async function handleReject() {
    if (!linkId) return
    setError(null)
    setIsSubmitting(true)
    try {
      await decideLinkRequest(linkId, 'reject', rejectReason || undefined)
      navigate('/school-admin/approvals', { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err, 'This request could not be rejected.'))
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
      topbar={<Topbar searchPlaceholder="Search…" right={<IconButton icon="bell" label="Notifications" />} />}
      mobileNav={
        <MobileTabBar items={isStaff ? staffTabs('approvals') : schoolAdminTabs('approvals')} />
      }
    >
      <div className="mx-auto max-w-lg">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate('/school-admin/approvals')}
        >
          Approvals
        </Button>

        {!request && !loadError && (
          <div role="status" aria-label="Loading request" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {loadError && <Banner tone="danger">{loadError}</Banner>}

        {request && (
          <>
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-ink">Review link request</h1>
              <StatusPill tone="warning" label="Pending" />
            </div>

            <Card className="mt-4">
              <div className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">
                Request
              </div>
              <div className="divide-y divide-line">
                <InfoRow label="Parent" value={request.parent_name} />
                <InfoRow label="Parent email" value={request.parent_email} />
                <InfoRow label="Student" value={request.student_name} />
                <InfoRow label="Student ID" value={request.student_id_code} />
                <InfoRow label="Class" value={request.class_name} />
              </div>
            </Card>

            {error && (
              <div className="mt-4">
                <Banner tone="danger">{error}</Banner>
              </div>
            )}

            {showRejectConfirm ? (
              <Card className="mt-4 p-5">
                <h2 className="font-semibold text-ink">Reject this request?</h2>
                <p className="text-sm text-muted">The parent will be notified. You can add a reason.</p>
                <textarea
                  rows={3}
                  aria-label="Rejection reason"
                  placeholder="Add a note for the parent (optional)…"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="mt-3 w-full rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted/80 focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                <div className="mt-4 flex gap-2">
                  <Button variant="danger" loading={isSubmitting} onClick={handleReject}>
                    Reject request
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={isSubmitting}
                    onClick={() => setShowRejectConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                <div className="mt-4 flex gap-2">
                  <Button fullWidth loading={isSubmitting} onClick={handleApprove}>
                    Approve link
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    disabled={isSubmitting}
                    onClick={() => setShowRejectConfirm(true)}
                  >
                    Reject
                  </Button>
                </div>
                <p className="mt-2 text-center text-xs text-muted">
                  Approving gives this parent access to the student’s wallet and orders.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
