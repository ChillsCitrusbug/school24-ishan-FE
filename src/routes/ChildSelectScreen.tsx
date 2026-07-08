import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  Button,
  Card,
  Avatar,
  EmptyState,
  ErrorState,
  Spinner,
  Icon,
} from '@/components'
import { getActiveContext, type ActiveChild } from '@/features/child-selection/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { parentNavGroups, parentTabs } from './parentNav'

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function formatBalance(balance: number): string {
  return `$${balance.toFixed(2)}`
}

/**
 * SC-064 · Child Selection — shared point-of-action chooser — Parent
 * (FR-022). Reuses the approved Sc064ChildSelect.tsx structure exactly.
 *
 * This is the SELECTION MECHANISM ONLY — the ticket's own explicit
 * words ("Out-of-scope: the actual ordering flow (FR-037). The actual
 * top-up flow (FR-029)."). With exactly one approved child, this
 * screen never renders the picker at all — it resolves directly and
 * navigates straight to `next` (matching "no selection step" verbatim).
 * With zero approved children, it shows the mock's own "only-pending"
 * empty state. `next` defaults to `/parent` (the same fallback
 * FR-019's own field-reconciliation doc already established for
 * "the real destination doesn't exist yet") — FR-029 (topping up a
 * child's wallet, the very next ticket in this batch) will be this
 * mechanism's first real consumer, passing its own `next`.
 *
 * FR-023 review finding (Major): the zero-approved-children empty
 * state's own "View requests" button used to point at `/parent` too —
 * a stale forward-reference of the exact same kind FR-019's own
 * "Back to my children" already had, just missed when FR-023 shipped
 * the real destination. Now points at `/parent/children`
 * (`MyChildrenScreen.tsx`), the real place a parent can see their
 * pending request's status.
 */
export function ChildSelectScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next') ?? '/parent'
  const [children, setChildren] = useState<ActiveChild[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const hasAutoResolved = useRef(false)

  useEffect(() => {
    let cancelled = false
    getActiveContext()
      .then((result) => {
        if (!cancelled) setChildren(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(extractErrorMessage(err, 'Your children could not be loaded.'))
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (children && children.length === 1 && !hasAutoResolved.current) {
      hasAutoResolved.current = true
      navigate(`${next}?childId=${children[0].student_id}`, { replace: true })
    }
  }, [children, next, navigate])

  const showPicker = children !== null && children.length > 1

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={parentNavGroups('children')}
          user={{ initials: user ? initialsOf(user.full_name) : '', name: user?.full_name ?? '', role: 'Parent' }}
        />
      }
      topbar={<Topbar searchPlaceholder="Search…" right={<IconButton icon="bell" label="Notifications" />} />}
      mobileNav={<MobileTabBar items={parentTabs('children')} />}
    >
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-ink">Choose a child</h1>
        <p className="mt-0.5 text-sm text-muted">Who are you ordering for?</p>

        {error ? (
          <Card className="mt-6">
            <ErrorState message={error} />
          </Card>
        ) : children === null ? (
          <div role="status" aria-label="Loading children" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : children.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon="children"
              title="No approved children yet"
              message="Your child's link is still pending school approval. You can order once it's approved."
              action={
                <Button onClick={() => navigate('/parent/children')}>View requests</Button>
              }
            />
          </Card>
        ) : showPicker ? (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {children.map((c) => (
              <button
                key={c.student_id}
                className="group flex items-center gap-3 rounded-card border border-line bg-white p-4 text-left shadow-softer transition hover:border-brand/40 hover:shadow-soft"
                onClick={() => navigate(`${next}?childId=${c.student_id}`)}
              >
                <Avatar initials={initialsOf(c.full_name)} tone="brand" />
                <div className="min-w-0">
                  <div className="font-semibold text-ink group-hover:text-brand-deep">
                    {c.full_name}
                  </div>
                  <div className="text-xs text-muted">
                    {c.class_name} · {c.school_name}
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-xs text-muted">Balance</div>
                  <div className="font-bold text-brand-deep">{formatBalance(c.wallet_balance)}</div>
                </div>
                <Icon name="arrowRight" className="h-4 w-4 text-muted" strokeWidth={2} />
              </button>
            ))}
          </div>
        ) : (
          <div role="status" aria-label="Loading children" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        )}
      </div>
    </AppShell>
  )
}
