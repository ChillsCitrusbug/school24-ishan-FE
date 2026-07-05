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
  ChildCard,
  EmptyState,
  ErrorState,
  Spinner,
} from '@/components'
import { listMyChildren, type MyChild } from '@/features/my-children/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'

const POLL_INTERVAL_MS = 10_000

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * SC-061 · My Children — Linked Children List — Parent (FR-023).
 * Reuses the approved Sc061MyChildren.tsx structure and its own
 * `ChildCard` component exactly (already ported to this codebase's
 * real component library, including the pending variant's own
 * "no action tiles" shape — the ticket's own "Pending children's
 * controls are disabled" requirement is satisfied by construction,
 * since the pending card renders no controls to disable).
 *
 * "Status flips in place... without requiring a page reload" (the
 * ticket's own DoD): no WebSocket/SSE infrastructure exists anywhere
 * in this codebase (confirmed before building this) — self-resolved
 * with a 10s polling interval while this screen is mounted, the
 * simplest genuine "live" behavior without inventing new real-time
 * transport for one screen.
 *
 * Round-1 review findings: (1) the poll's own fetch had no unmount
 * guard — an in-flight request resolving after unmount could still
 * call `setState`, unlike `ChildSelectScreen.tsx`'s own established
 * `cancelled`-flag precedent for the equivalent case; fixed with an
 * `isUnmountedRef`. (2) the mock's own topbar "Top up wallet" button
 * was silently dropped with no documented reason — restored, wired to
 * the already-real `/parent/wallet/top-up` route (the PARENT's own
 * wallet, same as `Sc064ChildSelect.tsx`'s identical topbar button —
 * unlike the per-child action tiles, this destination already exists,
 * so there was no "doesn't exist yet" justification for omitting it).
 *
 * FR-029 addition: the per-child "Top up" action tile — deliberately
 * left inert when this screen first shipped (its destination didn't
 * exist yet) — now navigates straight to `ChildWalletTopUpScreen.tsx`
 * with the child already known, skipping `ChildSelectScreen`'s own
 * picker entirely.
 */
export function MyChildrenScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [children, setChildren] = useState<MyChild[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isUnmountedRef = useRef(false)

  const load = useCallback((isBackgroundRefresh: boolean) => {
    if (!isBackgroundRefresh) setError(null)
    listMyChildren()
      .then((result) => {
        if (!isUnmountedRef.current) setChildren(result)
      })
      .catch((err: unknown) => {
        if (!isUnmountedRef.current && !isBackgroundRefresh) {
          setError(extractErrorMessage(err, 'Your children could not be loaded.'))
        }
      })
  }, [])

  useEffect(() => {
    isUnmountedRef.current = false
    load(false)
    const interval = setInterval(() => load(true), POLL_INTERVAL_MS)
    return () => {
      isUnmountedRef.current = true
      clearInterval(interval)
    }
  }, [load])

  const approved = children?.filter((c) => c.status === 'approved') ?? []
  const pending = children?.filter((c) => c.status === 'pending') ?? []

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={[]}
          user={{ initials: user ? initialsOf(user.full_name) : '', name: user?.full_name ?? '', role: 'Parent' }}
        />
      }
      topbar={
        <Topbar
          searchPlaceholder="Search children…"
          right={
            <>
              <IconButton icon="bell" label="Notifications" />
              <Button leadingIcon="plus" onClick={() => navigate('/parent/wallet/top-up')}>
                Top up wallet
              </Button>
            </>
          }
        />
      }
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">My children</h1>
            <p className="mt-0.5 text-sm text-muted">Linked children and pending requests.</p>
          </div>
          <Button leadingIcon="plus" onClick={() => navigate('/parent/children/add')}>
            Add a child
          </Button>
        </div>

        {error ? (
          <Card className="mt-6">
            <ErrorState message={error} action={<Button onClick={() => load(false)}>Try again</Button>} />
          </Card>
        ) : children === null ? (
          <div role="status" aria-label="Loading children" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : children.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon="children"
              title="No children linked yet"
              message="Add a child with their Student ID. The school approves the link, then you can order and top up."
              action={
                <Button leadingIcon="plus" onClick={() => navigate('/parent/children/add')}>
                  Add a child
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            {approved.length > 0 && (
              <>
                <div className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  Approved
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {approved.map((c) => (
                    <ChildCard
                      key={c.link_id}
                      initials={initialsOf(c.full_name)}
                      name={c.full_name}
                      meta={c.class_name ?? ''}
                      balance={`$${(c.wallet_balance ?? 0).toFixed(2)}`}
                      onTopUp={() =>
                        navigate(`/parent/wallet/top-up-child?childId=${c.student_id}`)
                      }
                    />
                  ))}
                </div>
              </>
            )}

            {pending.length > 0 && (
              <>
                <div className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted">
                  Pending approval
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {pending.map((c) => (
                    <ChildCard
                      key={c.link_id}
                      initials={initialsOf(c.full_name)}
                      name={c.full_name}
                      meta=""
                      pending
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
