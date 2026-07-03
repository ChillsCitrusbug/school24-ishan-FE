import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  Banner,
  ResultHero,
  Spinner,
} from '@/components'
import { listRoles, type Role } from '@/features/roles/api'
import { createStaff, getStaffDetail, updateStaff } from '@/features/staff/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * SC-035 · Add / Edit Staff form (with invitation) — School Admin
 * (FR-015). Reuses the approved Sc035AddStaff.tsx structure for BOTH
 * create and edit, matching how RoleBuilderScreen.tsx (FR-017/018) and
 * ClassFormScreen.tsx (FR-011) already handle the same "one shared form
 * component" shape — the mock's own "success" state only applies to
 * create (an edit save just returns to the list, no invite to confirm).
 *
 * Field-reconciliation decision #1: the mock's own form only shows
 * Full name/Email/Role — Mobile/Position/Department are added beyond
 * it, since the ticket's own text and the database both require them
 * (Position is NOT NULL), using only the same Field/Input components
 * already imported in the mock.
 */
export function StaffFormScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { staffId } = useParams<{ staffId?: string }>()
  const isEditMode = Boolean(staffId)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [position, setPosition] = useState('')
  const [department, setDepartment] = useState('')
  const [roleId, setRoleId] = useState('')
  const [roles, setRoles] = useState<Role[] | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [successState, setSuccessState] = useState<
    { staffProfileId: string; name: string; hasRole: boolean } | null
  >(null)

  useEffect(() => {
    let cancelled = false
    const rolesPromise = listRoles()
    const detailPromise = isEditMode && staffId ? getStaffDetail(staffId) : Promise.resolve(null)

    Promise.all([rolesPromise, detailPromise])
      .then(([roleList, detail]) => {
        if (cancelled) return
        setRoles(roleList)
        if (detail) {
          setFullName(detail.full_name)
          setEmail(detail.email)
          setMobile(detail.mobile ?? '')
          setPosition(detail.position)
          setDepartment(detail.department ?? '')
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(extractErrorMessage(err, 'This staff member could not be found.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isEditMode, staffId])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      if (isEditMode && staffId) {
        await updateStaff(staffId, {
          full_name: fullName,
          email,
          mobile: mobile || null,
          position,
          department: department || null,
        })
        navigate('/school-admin/staff')
      } else {
        const created = await createStaff({
          full_name: fullName,
          email,
          mobile: mobile || null,
          position,
          department: department || null,
          role_id: roleId || null,
        })
        setSuccessState({
          staffProfileId: created.staff_profile_id,
          name: created.full_name,
          hasRole: created.assigned_role_id !== null,
        })
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to save this staff member.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          brandSubtitle={user?.school_name ?? undefined}
          groups={schoolAdminNavGroups('staff')}
          user={{
            initials: user ? initialsOf(user.full_name) : '',
            name: user?.full_name ?? '',
            role: 'School Admin',
          }}
        />
      }
      topbar={<Topbar right={<IconButton icon="bell" label="Notifications" />} />}
      mobileNav={<MobileTabBar items={schoolAdminTabs('staff')} />}
    >
      <div className="mx-auto max-w-lg">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate('/school-admin/staff')}
        >
          Staff
        </Button>

        {isLoading ? (
          <div role="status" aria-label="Loading" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : loadError ? (
          <Card className="p-5">
            <Banner tone="danger">{loadError}</Banner>
          </Card>
        ) : successState ? (
          <Card className="p-6">
            <ResultHero
              ok
              title="Invite sent"
              message={`${successState.name} will get an email to set a password and activate their account.`}
            >
              {!successState.hasRole && (
                <Banner tone="info">
                  No role assigned yet — they&rsquo;ll have no access until you assign a role.
                </Banner>
              )}
              <div className="mt-5 flex w-full flex-col gap-2">
                {!successState.hasRole && (
                  <Button
                    onClick={() =>
                      navigate(`/school-admin/staff/${successState.staffProfileId}/assign-role`)
                    }
                  >
                    Assign a role now
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => navigate('/school-admin/staff')}
                >
                  Back to staff
                </Button>
              </div>
            </ResultHero>
          </Card>
        ) : (
          <Card className="p-5">
            <h1 className="text-xl font-bold text-ink">
              {isEditMode ? 'Edit staff member' : 'Add a staff member'}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {isEditMode
                ? "Update this staff member's details."
                : 'Invite them by email and optionally assign a role.'}
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              {error && <Banner tone="danger">{error}</Banner>}
              <Field label="Full name">
                <Input
                  placeholder="Ben Whitlock"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  leadingIcon="user"
                  placeholder="name@greenvale.edu.au"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field label="Mobile" hint="Optional">
                <Input
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+1-555-0100"
                />
              </Field>
              <Field label="Position">
                <Input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Canteen Assistant"
                  required
                />
              </Field>
              <Field label="Department" hint="Optional">
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Canteen"
                />
              </Field>
              {!isEditMode && (
                <Field label="Role" hint="Optional — you can assign this later.">
                  <Select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                    <option value="">No role yet</option>
                    {(roles ?? []).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              {!isEditMode && (
                <Banner tone="info">
                  An activation email is sent automatically. The staff member sets their own
                  password.
                </Banner>
              )}
              <Button type="submit" fullWidth loading={isSubmitting}>
                {isEditMode ? 'Save changes' : 'Send invite'}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
