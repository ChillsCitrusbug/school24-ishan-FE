import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  StatusPill,
  ErrorState,
  Spinner,
} from '@/components'
import { getStudent, type Student } from '@/features/students/api'
import { listGuardians, removeGuardian, type Guardian } from '@/features/guardians/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

const CAP = 4

/**
 * SC-045 · Manage Student Guardians / Remove Parent Link — School
 * Admin only (FR-021 — "Staff are not granted link removal by this
 * story"). Reuses the approved Sc045Guardians.tsx structure exactly,
 * including its at-cap (4/4) banner.
 *
 * The mock's own `state` prop only models `'default' | 'at-cap'` — no
 * confirm sub-state despite the ticket's Design reference calling this
 * a "destructive-confirm-remove" screen. Built as a minimal necessary
 * addition (same reasoning as FR-026's own "Updating…" label): clicking
 * "Remove" turns that row into an inline "Remove this guardian?
 * [Confirm removal] [Cancel]" state, rather than a full-page navigation
 * — appropriate for a per-row action inside a list, and the lightest
 * addition that satisfies "destructive-confirm" without inventing a
 * whole new screen the mock doesn't have.
 *
 * Round-1 review finding (Minor): every OTHER row's plain "Remove"
 * button is disabled while any removal is in flight (`removingId !==
 * null`) — without this, clicking a different row's "Remove" while row
 * A's DELETE was still outstanding would flip `confirmingId` away from
 * A, collapsing it back to its plain (non-disabled) state and letting
 * a second concurrent DELETE fire for the same `link_id`.
 */
export function GuardiansScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { studentId } = useParams<{ studentId: string }>()
  const [student, setStudent] = useState<Student | null>(null)
  const [guardians, setGuardians] = useState<Guardian[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!studentId) return
    setLoadError(null)
    Promise.all([getStudent(studentId), listGuardians(studentId)])
      .then(([studentResult, guardiansResult]) => {
        setStudent(studentResult)
        setGuardians(guardiansResult)
      })
      .catch((err: unknown) => {
        setLoadError(extractErrorMessage(err, 'This student could not be found.'))
      })
  }, [studentId])

  useEffect(() => {
    load()
  }, [load])

  async function handleRemove(linkId: string) {
    setActionError(null)
    setRemovingId(linkId)
    try {
      await removeGuardian(linkId)
      setGuardians((prev) => prev?.filter((g) => g.link_id !== linkId) ?? prev)
      setConfirmingId(null)
    } catch (err) {
      setActionError(extractErrorMessage(err, 'This guardian could not be removed.'))
    } finally {
      setRemovingId(null)
    }
  }

  const atCap = (guardians?.length ?? 0) >= CAP

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          brandSubtitle={user?.school_name ?? undefined}
          groups={schoolAdminNavGroups('students')}
          user={{
            initials: user ? initialsOf(user.full_name) : '',
            name: user?.full_name ?? '',
            role: 'School Admin',
          }}
        />
      }
      topbar={<Topbar searchPlaceholder="Search…" right={<IconButton icon="bell" label="Notifications" />} />}
      mobileNav={<MobileTabBar items={schoolAdminTabs('students')} />}
    >
      <div className="mx-auto max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => (studentId ? navigate(`/school-admin/students/${studentId}`) : navigate('/school-admin/students'))}
        >
          Student
        </Button>

        {loadError ? (
          <Card className="mt-6">
            <ErrorState
              message={loadError}
              action={
                <Button variant="secondary" onClick={load}>
                  Try again
                </Button>
              }
            />
          </Card>
        ) : !student || !guardians ? (
          <div role="status" aria-label="Loading guardians" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-ink">Guardians — {student.full_name}</h1>
            <p className="mt-0.5 text-sm text-muted">Parents linked to this student. Up to 4 are allowed.</p>

            {atCap && (
              <div className="mt-4">
                <Banner tone="warning">
                  This student has the maximum of 4 linked guardians. Remove one to add another.
                </Banner>
              </div>
            )}

            {actionError && (
              <div className="mt-4">
                <Banner tone="danger">{actionError}</Banner>
              </div>
            )}

            <Card className="mt-4 divide-y divide-line">
              {guardians.map((g) => (
                <div key={g.link_id} className="px-5 py-4">
                  {confirmingId === g.link_id ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex-1 text-sm text-ink">
                        Remove <b>{g.parent_name}</b>? They will immediately lose access to this
                        student's wallet and orders.
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="danger"
                          loading={removingId === g.link_id}
                          onClick={() => handleRemove(g.link_id)}
                        >
                          Confirm removal
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={removingId === g.link_id}
                          onClick={() => setConfirmingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <Avatar initials={initialsOf(g.parent_name)} tone="brand" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{g.parent_name}</span>
                          <StatusPill tone="success" label="Approved" />
                        </div>
                        <div className="text-xs text-muted">{g.parent_email}</div>
                      </div>
                      <button
                        type="button"
                        disabled={removingId !== null}
                        className="inline-flex items-center gap-1 text-sm font-medium text-danger hover:text-danger/80 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => setConfirmingId(g.link_id)}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </Card>

            <p className="mt-3 text-center text-sm text-muted">{guardians.length} of 4 guardians linked</p>
          </>
        )}
      </div>
    </AppShell>
  )
}
