import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppShell,
  Badge,
  Banner,
  Button,
  Card,
  Icon,
  MobileTabBar,
  Sidebar,
  Topbar,
} from '@/components'
import { useAuth } from '@/features/auth/useAuth'
import * as twoFactorApi from '@/features/two-factor/api'
import { extractErrorMessage } from '@/lib/api-error'

const CODE_LENGTH = 6

const PROFILE_PATH: Record<string, string> = {
  platform_admin: '/platform-admin/profile',
  school_admin: '/school-admin/profile',
  staff: '/staff/profile',
  parent: '/parent/profile',
}

type Mode = 'off' | 'confirm' | 'backup-codes' | 'on'

/**
 * Sc101TwoFactorSetup.tsx — Setup & Recovery (FR-050).
 *
 * The approved mock's own "Authenticator app vs. Email code" method
 * picker is NOT rendered — the ticket's own Interaction contract is
 * explicit: "Method is fixed to email OTP — no method-select branching
 * in the UI or API" (field-reconciliation "tension" section). Straight
 * to the email-OTP confirmation step.
 *
 * No design state exists for "2FA is already ON" (manage/disable) — the
 * `on` mode below is a minimal extension of the same Card/Badge/Button
 * language (field-reconciliation decision #2), required by the ticket's
 * own Scenario 5.
 */
export function TwoFactorSetupScreen() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const backHref = user ? (PROFILE_PATH[user.role] ?? '/login') : '/login'

  const [mode, setMode] = useState<Mode>(user?.two_factor_enabled ? 'on' : 'off')
  const [challengeToken, setChallengeToken] = useState<string | null>(null)
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [disabling, setDisabling] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Only syncs from context in the 'off'/'on' steady states — never
  // clobbers an in-flight 'confirm'/'backup-codes' step. Review round 1,
  // Major finding #3: `user` in context was a point-in-time snapshot
  // from login that never updated after a successful enable/disable, so
  // this screen (and EmailRoleProfileScreen's own Security row, which
  // reads the same context field) showed stale state until the next
  // full page load. `refreshUser()` (called after confirm/disable below)
  // fixes that — this effect is what actually applies the fresh value,
  // but must not fire mid-flow or it would yank the user off the
  // backup-codes screen the instant refreshUser() resolves.
  useEffect(() => {
    setMode((current) => {
      if (current === 'confirm' || current === 'backup-codes') return current
      return user?.two_factor_enabled ? 'on' : 'off'
    })
  }, [user?.two_factor_enabled])

  async function handleStart() {
    setError(null)
    setStarting(true)
    try {
      const result = await twoFactorApi.startEnable()
      setChallengeToken(result.challenge_token)
      setMode('confirm')
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to start two-factor setup.'))
    } finally {
      setStarting(false)
    }
  }

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    setDigits((prev) => {
      const next = [...prev]
      next[index] = digit
      return next
    })
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  async function handleConfirm(event: FormEvent) {
    event.preventDefault()
    if (!challengeToken) return
    setError(null)
    setConfirming(true)
    try {
      const result = await twoFactorApi.confirmEnable(challengeToken, digits.join(''))
      setBackupCodes(result.backup_codes)
      setMode('backup-codes')
      await refreshUser()
    } catch (err) {
      setError(extractErrorMessage(err, 'That code is incorrect or has expired. Please try again.'))
      setDigits(Array(CODE_LENGTH).fill(''))
    } finally {
      setConfirming(false)
    }
  }

  async function handleDisable() {
    setError(null)
    setDisabling(true)
    try {
      await twoFactorApi.disable()
      setMode('off')
      await refreshUser()
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to turn off two-factor authentication.'))
    } finally {
      setDisabling(false)
    }
  }

  function handleDownloadCodes() {
    const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'school24-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={[]}
          user={{ initials: '', name: user?.full_name ?? '', role: user?.role ?? '' }}
        />
      }
      topbar={<Topbar />}
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-md space-y-4">
        <button
          type="button"
          onClick={() => navigate(backHref)}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
        >
          <Icon name="chevronLeft" className="h-4 w-4" /> Security
        </button>

        {(mode === 'off' || mode === 'confirm') && (
          <Card className="p-5">
            <div className="mb-1 flex items-center justify-between">
              <h1 className="text-xl font-semibold text-ink">Two-factor authentication</h1>
              <Badge tone="neutral">Off</Badge>
            </div>
            <p className="mb-4 text-sm text-muted">Add a second step when you sign in.</p>

            {error && (
              <div className="mb-4">
                <Banner tone="danger">{error}</Banner>
              </div>
            )}

            {mode === 'off' && (
              <>
                <p className="mb-4 text-sm text-ink">
                  We&apos;ll email a sign-in code to <strong>{user?.email}</strong> each time you
                  log in.
                </p>
                <Button fullWidth onClick={handleStart} loading={starting}>
                  Turn on two-factor authentication
                </Button>
              </>
            )}

            {mode === 'confirm' && (
              <form onSubmit={handleConfirm} className="space-y-4">
                <p className="text-sm text-ink">
                  Enter the 6-digit code we emailed to confirm setup.
                </p>
                <div className="flex justify-between gap-2">
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      aria-label={`Digit ${index + 1}`}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      className="h-11 w-10 rounded-control border border-line text-center text-lg font-semibold text-ink focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  ))}
                </div>
                <Button
                  type="submit"
                  fullWidth
                  loading={confirming}
                  disabled={digits.some((d) => !d)}
                >
                  Verify &amp; turn on
                </Button>
              </form>
            )}
          </Card>
        )}

        {mode === 'backup-codes' && (
          <Card className="p-5">
            <div className="mb-1 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-success-soft text-success">
                <Icon name="check" className="h-5 w-5" />
              </span>
              <h1 className="text-xl font-semibold text-ink">Two-factor is on</h1>
            </div>
            <p className="mb-4 text-sm text-muted">Save these backup codes somewhere safe.</p>
            <div className="mb-4">
              <Banner tone="warning">
                Each code works once. If you lose your device, use one to sign in.
              </Banner>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-2 font-mono text-sm text-ink">
              {backupCodes.map((code) => (
                <div key={code} className="rounded-control bg-canvas px-2 py-1.5 text-center">
                  {code}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" leadingIcon="export" onClick={handleDownloadCodes}>
                Download codes
              </Button>
              <Button variant="secondary" onClick={() => setMode('on')}>
                Done
              </Button>
            </div>
          </Card>
        )}

        {mode === 'on' && (
          <Card className="p-5">
            <div className="mb-1 flex items-center justify-between">
              <h1 className="text-xl font-semibold text-ink">Two-factor authentication</h1>
              <Badge tone="success">On</Badge>
            </div>
            <p className="mb-4 text-sm text-muted">
              You&apos;ll be asked for a code each time you sign in.
            </p>
            {error && (
              <div className="mb-4">
                <Banner tone="danger">{error}</Banner>
              </div>
            )}
            <Button variant="danger" fullWidth onClick={handleDisable} loading={disabling}>
              Turn off two-factor authentication
            </Button>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
