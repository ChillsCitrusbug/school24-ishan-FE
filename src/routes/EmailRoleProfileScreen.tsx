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
  Toggle,
  Topbar,
  type NavGroup,
  type TabItem,
} from '@/components'
import { useAuth } from '@/features/auth/useAuth'
import * as profileApi from '@/features/profile/api'
import { extractErrorMessage } from '@/lib/api-error'

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Shared internal implementation behind Sc022PaProfile.tsx / Sc097SaProfile.tsx
 * / Sc042StaffProfile.tsx / Sc069ParentProfile.tsx (FR-048) — all 4 email-
 * login roles' approved profile screens share one identical structure
 * (identity card + Email/Mobile InfoRows + Password/2FA SettingRows +
 * Notifications card), differing only in copy/nav/an extra field (Staff
 * ID) — a single parameterized component avoids 4 near-duplicate 250-line
 * files. Each role's own thin route file (PaProfileScreen.tsx etc.) only
 * supplies that role-specific configuration.
 *
 * Notification toggles are local-only, non-persisted UI state (field-
 * reconciliation decision, docs/design/field-reconciliation/FR-048.md
 * "Matched" section — no backend concept exists yet; matches the design
 * mock's own useState-only implementation). The 2FA row now links to
 * /two-factor-setup for real (FR-050) — it was inert at FR-048's own
 * build time, wired up once its own ticket landed later in this batch.
 */
export function EmailRoleProfileScreen({
  roleLabel,
  backLabel,
  backHref,
  navGroups,
  tabs,
  notificationLabels,
  extraInfoRows = [],
}: {
  roleLabel: string
  backLabel: string
  backHref: string
  navGroups: NavGroup[]
  tabs: TabItem[]
  notificationLabels: [string, string, string]
  extraInfoRows?: { label: string; value: string }[]
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<profileApi.Profile | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [mode, setMode] = useState<'view' | 'edit' | 'change-password' | 'change-email'>('view')

  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  const [prefs, setPrefs] = useState({ a: true, b: true, c: false })

  useEffect(() => {
    let mounted = true
    profileApi
      .getProfile()
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

  function startEdit() {
    if (!profile) return
    setFullName(profile.full_name)
    setMobile(profile.mobile ?? '')
    setNewEmail(profile.email)
    setProfileError(null)
    setEmailError(null)
    setEmailSent(false)
    setMode('edit')
  }

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault()
    setProfileError(null)
    setProfileSaving(true)
    try {
      const updated = await profileApi.updateProfile(fullName, mobile || null)
      setProfile(updated)
      setMode('view')
    } catch (err) {
      setProfileError(extractErrorMessage(err, 'Unable to update your profile.'))
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleRequestEmailChange(event: FormEvent) {
    event.preventDefault()
    setEmailError(null)
    setEmailSaving(true)
    try {
      await profileApi.requestEmailChange(newEmail)
      setEmailSent(true)
    } catch (err) {
      setEmailError(extractErrorMessage(err, 'Unable to update your email.'))
    } finally {
      setEmailSaving(false)
    }
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault()
    setPasswordError(null)
    setPasswordSaving(true)
    try {
      await profileApi.changePassword(currentPassword, newPassword, confirmPassword)
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
    setMode('view')
    setProfileError(null)
    setEmailError(null)
    setPasswordError(null)
    setPasswordSaved(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const initials = initialsOf(profile?.full_name ?? user?.full_name ?? '')

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={navGroups}
          user={{ initials, name: profile?.full_name ?? user?.full_name ?? '', role: roleLabel }}
        />
      }
      topbar={<Topbar />}
      mobileNav={<MobileTabBar items={tabs} />}
    >
      <div className="mx-auto max-w-2xl space-y-4">
        <button
          type="button"
          onClick={() => navigate(backHref)}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
        >
          <Icon name="chevronLeft" className="h-4 w-4" /> {backLabel}
        </button>
        <div>
          <h1 className="text-xl font-semibold text-ink">Profile &amp; settings</h1>
          <p className="text-sm text-muted">Manage your account, security and notifications.</p>
        </div>

        {loadError && <Banner tone="danger">{loadError}</Banner>}

        {profile && mode === 'view' && (
          <>
            <Card>
              <div className="flex items-center gap-3 px-5 py-4">
                <Avatar initials={initials} tone="brand" size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink">{profile.full_name}</div>
                  <div className="text-xs text-muted">
                    {roleLabel}
                    {user?.school_name ? ` · ${user.school_name}` : ''}
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={startEdit}>
                  Edit
                </Button>
              </div>
              <div className="divide-y divide-line border-t border-line">
                <InfoRow label="Email" value={profile.email} />
                <InfoRow label="Mobile" value={profile.mobile || '—'} />
                {extraInfoRows.map((row) => (
                  <InfoRow key={row.label} label={row.label} value={row.value} />
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Security" />
              <div className="divide-y divide-line border-t border-line">
                <SettingRow
                  icon="lock"
                  title="Password"
                  desc="Change your sign-in password"
                  action={
                    <Button variant="secondary" size="sm" onClick={() => setMode('change-password')}>
                      Change
                    </Button>
                  }
                />
                <SettingRow
                  icon="shield"
                  title="Two-factor authentication"
                  desc={
                    user?.two_factor_enabled
                      ? 'On — a code is required each time you sign in'
                      : 'Add an extra layer of security'
                  }
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate('/two-factor-setup')}
                    >
                      {user?.two_factor_enabled ? 'Manage' : 'Set up'}
                    </Button>
                  }
                />
              </div>
            </Card>

            <Card>
              <CardHeader title="Notifications" />
              <div className="divide-y divide-line border-t border-line px-5">
                {(['a', 'b', 'c'] as const).map((key, i) => (
                  <div key={key} className="flex items-center justify-between py-3">
                    <span className="text-sm text-ink">{notificationLabels[i]}</span>
                    <Toggle
                      checked={prefs[key]}
                      onChange={(value) => setPrefs((p) => ({ ...p, [key]: value }))}
                      label={notificationLabels[i]}
                    />
                  </div>
                ))}
              </div>
            </Card>

            <Button variant="secondary" fullWidth onClick={logout}>
              Sign out
            </Button>
          </>
        )}

        {profile && mode === 'edit' && (
          <Card className="p-5">
            <h2 className="mb-1 text-lg font-semibold text-ink">Edit profile</h2>
            <p className="mb-4 text-sm text-muted">Update your name and mobile number.</p>
            {profileError && (
              <div className="mb-3">
                <Banner tone="danger">{profileError}</Banner>
              </div>
            )}
            <form className="space-y-4" onSubmit={handleSaveProfile}>
              <Field label="Full name">
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Mobile" hint="Optional">
                <Input value={mobile} onChange={(e) => setMobile(e.target.value)} />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" loading={profileSaving}>
                  Save changes
                </Button>
                <Button type="button" variant="secondary" onClick={cancelToView}>
                  Cancel
                </Button>
              </div>
            </form>

            <div className="mt-6 border-t border-line pt-5">
              <h3 className="mb-1 text-sm font-semibold text-ink">Email address</h3>
              {emailSent ? (
                <Banner tone="success">
                  We&apos;ve sent a confirmation link to your new email address. Your current
                  email stays active until you confirm.
                </Banner>
              ) : (
                <form className="space-y-3" onSubmit={handleRequestEmailChange}>
                  <Field
                    label="Email"
                    error={emailError ?? undefined}
                    hint="Changing this requires confirming a link sent to the new address."
                  >
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                    />
                  </Field>
                  <Button type="submit" variant="secondary" size="sm" loading={emailSaving}>
                    Update email
                  </Button>
                </form>
              )}
            </div>
          </Card>
        )}

        {mode === 'change-password' && (
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
