import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppShell,
  Avatar,
  Banner,
  Button,
  Card,
  CardHeader,
  Field,
  Icon,
  Input,
  InfoRow,
  MobileTabBar,
  SettingRow,
  Sidebar,
  Topbar,
} from '@/components'
import { useStudentAuth } from '@/features/student-auth/useStudentAuth'
import * as studentProfileApi from '@/features/student-profile/api'
import { extractErrorMessage } from '@/lib/api-error'

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Sc098StudentProfile.tsx — Student (FR-048). Read-only apart from
 * password: Student Name, Student ID, Class are administered only by
 * the school (must-not: a Student attempting to change any of them
 * returns 403 server-side — no Edit affordance is rendered here at all,
 * matching the approved design, and the backend's own defensive PATCH
 * endpoint enforces this even without a client path that ever calls it).
 * No 2FA row, no notification toggles — neither exists in the approved
 * mock for this role.
 */
export function StudentProfileScreen() {
  const { student, logout } = useStudentAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<studentProfileApi.StudentProfile | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    let mounted = true
    studentProfileApi
      .getStudentProfile()
      .then((data) => {
        if (mounted) setProfile(data)
      })
      .catch((err: unknown) => {
        if (mounted) setLoadError(extractErrorMessage(err, 'Unable to load your profile.'))
      })
    return () => {
      mounted = false
    }
  }, [])

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault()
    setPasswordError(null)
    setPasswordSaving(true)
    try {
      await studentProfileApi.changeStudentPassword(currentPassword, newPassword, confirmPassword)
      setPasswordSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(extractErrorMessage(err, 'Unable to change your password.'))
    } finally {
      setPasswordSaving(false)
    }
  }

  function cancelToView() {
    setChangingPassword(false)
    setPasswordError(null)
    setPasswordSaved(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const initials = initialsOf(profile?.full_name ?? student?.full_name ?? '')

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={[]}
          user={{ initials, name: profile?.full_name ?? student?.full_name ?? '', role: 'Student' }}
        />
      }
      topbar={<Topbar />}
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-2xl space-y-4">
        <button
          type="button"
          onClick={() => navigate('/student')}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
        >
          <Icon name="chevronLeft" className="h-4 w-4" /> Home
        </button>
        <div>
          <h1 className="text-xl font-semibold text-ink">My account</h1>
          <p className="text-sm text-muted">Your school details and password.</p>
        </div>

        {loadError && <Banner tone="danger">{loadError}</Banner>}

        {profile && !changingPassword && (
          <>
            <Card>
              <div className="flex items-center gap-3 px-5 py-4">
                <Avatar initials={initials} tone="brand" size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink">{profile.full_name}</div>
                  <div className="text-xs text-muted">Student</div>
                </div>
              </div>
              <div className="divide-y divide-line border-t border-line">
                <InfoRow label="Student ID" value={profile.student_id} />
                <InfoRow label="Class" value={profile.class_label || '—'} />
              </div>
            </Card>

            <Banner tone="info">
              Your name, class and Student ID are managed by your school. Ask your teacher if
              anything looks wrong.
            </Banner>

            <Card>
              <CardHeader title="Security" />
              <div className="divide-y divide-line border-t border-line">
                <SettingRow
                  icon="lock"
                  title="Password"
                  desc="Change your sign-in password"
                  action={
                    <Button variant="secondary" size="sm" onClick={() => setChangingPassword(true)}>
                      Change
                    </Button>
                  }
                />
              </div>
            </Card>

            <Button variant="secondary" fullWidth onClick={logout}>
              Sign out
            </Button>
          </>
        )}

        {changingPassword && (
          <Card className="p-5">
            <h2 className="mb-1 text-lg font-semibold text-ink">Change password</h2>
            <p className="mb-4 text-xs text-muted">
              Use at least 8 characters with a number and a symbol.
            </p>
            {passwordSaved ? (
              <>
                <Banner tone="success">Your password has been changed.</Banner>
                <div className="mt-4">
                  <Button variant="secondary" onClick={cancelToView}>
                    Done
                  </Button>
                </div>
              </>
            ) : (
              <form className="space-y-4" onSubmit={handleChangePassword}>
                {passwordError && <Banner tone="danger">{passwordError}</Banner>}
                <Field label="Current password">
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </Field>
                <Field label="New password">
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Confirm new password">
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </Field>
                <div className="flex gap-2">
                  <Button type="submit" loading={passwordSaving}>
                    Save password
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
    </AppShell>
  )
}
