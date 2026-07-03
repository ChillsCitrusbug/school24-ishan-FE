import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AppShell,
  Banner,
  Button,
  Card,
  Dialog,
  Field,
  Input,
  InfoRow,
  MobileTabBar,
  Sidebar,
  StatusPill,
  Spinner,
  Topbar,
} from '@/components'
import { useAuth } from '@/features/auth/useAuth'
import * as schoolsApi from '@/features/schools/api'
import { extractErrorMessage } from '@/lib/api-error'
import { platformAdminNavGroups, platformAdminTabs } from './platformAdminNav'

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function formatOnboarded(createdAt: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(
    new Date(createdAt),
  )
}

type Mode = 'view' | 'edit' | 'reassign'

/**
 * Sc019SchoolDetail.tsx — School Detail & Edit (FR-007: edit + reassign
 * admin; FR-008: activate/deactivate — this ticket extends the same
 * screen FR-007 built, adding the deactivate-confirm Dialog state the
 * mock's own name references but FR-007 deliberately left out of scope).
 *
 * The mock's own "School details" card has no visible Edit affordance —
 * reuses the same view/edit-mode toggle already approved and shipped
 * for FR-048's profile screens (`EmailRoleProfileScreen.tsx`) rather
 * than inventing a new edit UI (field-reconciliation decision #2).
 */
export function SchoolDetailScreen() {
  const { schoolId } = useParams<{ schoolId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [school, setSchool] = useState<schoolsApi.School | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('view')

  const [schoolName, setSchoolName] = useState('')
  const [schoolType, setSchoolType] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [address, setAddress] = useState('')
  const [stateRegion, setStateRegion] = useState('')
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [detailsSaving, setDetailsSaving] = useState(false)

  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [reassignError, setReassignError] = useState<string | null>(null)
  const [reassignSaving, setReassignSaving] = useState(false)
  const [reassignSent, setReassignSent] = useState(false)

  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [statusSaving, setStatusSaving] = useState(false)

  useEffect(() => {
    if (!schoolId) return
    let mounted = true
    schoolsApi
      .getSchool(schoolId)
      .then((data) => {
        if (mounted) setSchool(data)
      })
      .catch((err: unknown) => {
        if (mounted) setLoadError(extractErrorMessage(err, 'Unable to load this school.'))
      })
    return () => {
      mounted = false
    }
  }, [schoolId])

  function startEdit() {
    if (!school) return
    setSchoolName(school.school_name)
    setSchoolType(school.school_type)
    setContactNumber(school.contact_number)
    setAddress(school.address ?? '')
    setStateRegion(school.state_region ?? '')
    setDetailsError(null)
    setMode('edit')
  }

  function startReassign() {
    setNewAdminName('')
    setNewAdminEmail('')
    setReassignError(null)
    setReassignSent(false)
    setMode('reassign')
  }

  function cancelToView() {
    setMode('view')
    setDetailsError(null)
    setReassignError(null)
  }

  async function handleSaveDetails(event: FormEvent) {
    event.preventDefault()
    if (!schoolId) return
    setDetailsError(null)
    setDetailsSaving(true)
    try {
      const updated = await schoolsApi.updateSchool(schoolId, {
        school_name: schoolName,
        school_type: schoolType,
        contact_number: contactNumber,
        address: address || null,
        state_region: stateRegion || null,
      })
      setSchool(updated)
      setMode('view')
    } catch (err) {
      setDetailsError(extractErrorMessage(err, 'Unable to update this school.'))
    } finally {
      setDetailsSaving(false)
    }
  }

  async function handleReassign(event: FormEvent) {
    event.preventDefault()
    if (!schoolId) return
    setReassignError(null)
    setReassignSaving(true)
    try {
      const updated = await schoolsApi.reassignAdmin(schoolId, {
        full_name: newAdminName,
        email: newAdminEmail,
      })
      setSchool(updated)
      setReassignSent(true)
    } catch (err) {
      setReassignError(extractErrorMessage(err, 'Unable to reassign the School Admin.'))
    } finally {
      setReassignSaving(false)
    }
  }

  async function handleDeactivate() {
    if (!schoolId) return
    setStatusError(null)
    setStatusSaving(true)
    try {
      const updated = await schoolsApi.setSchoolStatus(schoolId, false)
      setSchool(updated)
      setStatusDialogOpen(false)
    } catch (err) {
      setStatusError(extractErrorMessage(err, 'Unable to deactivate this school.'))
    } finally {
      setStatusSaving(false)
    }
  }

  async function handleReactivate() {
    if (!schoolId) return
    setStatusError(null)
    setStatusSaving(true)
    try {
      const updated = await schoolsApi.setSchoolStatus(schoolId, true)
      setSchool(updated)
    } catch (err) {
      setStatusError(extractErrorMessage(err, 'Unable to reactivate this school.'))
    } finally {
      setStatusSaving(false)
    }
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          brandSubtitle="Platform"
          groups={platformAdminNavGroups()}
          user={{
            initials: user ? initialsOf(user.full_name) : '',
            name: user?.full_name ?? '',
            role: 'Platform Admin',
          }}
        />
      }
      topbar={<Topbar />}
      mobileNav={<MobileTabBar items={platformAdminTabs()} />}
    >
      <div className="mx-auto max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate('/platform-admin/schools')}
        >
          Schools
        </Button>

        {loadError && <Banner tone="danger">{loadError}</Banner>}

        {!school && !loadError && (
          <div role="status" aria-label="Loading school" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {school && mode === 'view' && (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-ink">{school.school_name}</h1>
                <p className="mt-0.5 text-sm text-muted">
                  Onboarded {formatOnboarded(school.created_at)}
                </p>
              </div>
              <StatusPill
                tone={school.is_active ? 'success' : 'danger'}
                label={school.is_active ? 'Active' : 'Inactive'}
              />
            </div>

            {/* Only shown for the reactivate flow (no dialog) — a
                deactivate-flow error renders inside the still-open
                dialog itself instead (see the Dialog's own children
                below), never both at once. */}
            {statusError && !statusDialogOpen && (
              <div className="mt-3">
                <Banner tone="danger">{statusError}</Banner>
              </div>
            )}

            <Card className="mt-4">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <span className="text-sm font-semibold text-ink">School details</span>
                <Button variant="secondary" size="sm" onClick={startEdit}>
                  Edit
                </Button>
              </div>
              <div className="divide-y divide-line">
                <InfoRow label="School name" value={school.school_name} />
                <InfoRow label="School type" value={school.school_type} />
                <InfoRow label="Contact number" value={school.contact_number} />
                <InfoRow label="Address" value={school.address || '—'} />
                <InfoRow label="State/Region" value={school.state_region || '—'} />
                <InfoRow label="Lead admin" value={school.primary_contact_name} />
                <InfoRow label="Admin email" value={school.primary_contact_email} />
                <InfoRow label="Students" value={String(school.student_count)} />
              </div>
            </Card>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" fullWidth onClick={startReassign}>
                Reassign admin
              </Button>
              {school.is_active ? (
                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => {
                    setStatusError(null)
                    setStatusDialogOpen(true)
                  }}
                >
                  Deactivate school
                </Button>
              ) : (
                <Button variant="secondary" fullWidth loading={statusSaving} onClick={handleReactivate}>
                  Activate school
                </Button>
              )}
            </div>
          </>
        )}

        {school && mode === 'edit' && (
          <Card className="p-5">
            <h2 className="mb-1 text-lg font-semibold text-ink">Edit school details</h2>
            <p className="mb-4 text-sm text-muted">Update this school's stored information.</p>
            {detailsError && (
              <div className="mb-3">
                <Banner tone="danger">{detailsError}</Banner>
              </div>
            )}
            <form className="space-y-4" onSubmit={handleSaveDetails}>
              <Field label="School name">
                <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} required />
              </Field>
              <Field label="School type">
                <Input value={schoolType} onChange={(e) => setSchoolType(e.target.value)} required />
              </Field>
              <Field label="Contact number">
                <Input
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  required
                />
              </Field>
              <Field label="Address" hint="Optional">
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </Field>
              <Field label="State/Region" hint="Optional">
                <Input value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" loading={detailsSaving}>
                  Save changes
                </Button>
                <Button type="button" variant="secondary" onClick={cancelToView}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {school && mode === 'reassign' && (
          <Card className="p-5">
            <h2 className="mb-1 text-lg font-semibold text-ink">Reassign School Admin</h2>
            <p className="mb-4 text-sm text-muted">
              Invite a new School Admin by email. The current admin,{' '}
              <span className="font-medium text-ink">{school.primary_contact_name}</span>, loses
              access to this school immediately once the new admin is invited.
            </p>
            {reassignSent ? (
              <>
                <Banner tone="success">
                  {newAdminName} has been invited and will gain full access once they register.
                  The previous admin's access has been revoked.
                </Banner>
                <div className="mt-4">
                  <Button variant="secondary" onClick={cancelToView}>
                    Done
                  </Button>
                </div>
              </>
            ) : (
              <form className="space-y-4" onSubmit={handleReassign}>
                {reassignError && <Banner tone="danger">{reassignError}</Banner>}
                <Field label="New admin's full name">
                  <Input
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    required
                  />
                </Field>
                <Field label="New admin's email">
                  <Input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    required
                  />
                </Field>
                <div className="flex gap-2">
                  <Button type="submit" loading={reassignSaving}>
                    Reassign admin
                  </Button>
                  <Button type="button" variant="secondary" onClick={cancelToView}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </Card>
        )}
      </div>

      {school && (
        <Dialog
          open={statusDialogOpen}
          onClose={() => {
            setStatusDialogOpen(false)
            setStatusError(null)
          }}
          tone="danger"
          title={`Deactivate ${school.school_name}?`}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setStatusDialogOpen(false)
                  setStatusError(null)
                }}
              >
                Cancel
              </Button>
              <Button variant="danger" loading={statusSaving} onClick={handleDeactivate}>
                Deactivate school
              </Button>
            </>
          }
        >
          {/* Review round 1, Major finding: an error on confirm (e.g. the
              ticket's own named 409 must-not) must render INSIDE the
              dialog, not in the view-mode banner behind it — the modal's
              own overlay makes anything behind it unreadable. */}
          {statusError && (
            <div className="mb-3">
              <Banner tone="danger">{statusError}</Banner>
            </div>
          )}
          This immediately blocks sign-in for all staff, parents and students at this school. You
          can reactivate it later.
        </Dialog>
      )}
    </AppShell>
  )
}
