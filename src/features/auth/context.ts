import { createContext } from 'react'
import type { LoginResult, UserSummary } from './api'

export interface AuthContextValue {
  user: UserSummary | null
  isAuthenticating: boolean
  /** Returns the raw login result — callers check
   * `'must_provide_2fa' in result` (FR-050) to decide whether to
   * navigate to the second-factor challenge screen or straight to the
   * role home, same pattern as StudentAuthContext's own `login()`. */
  login: (email: string, password: string) => Promise<LoginResult>
  /** True only between a password-accepted 2FA challenge and its
   * redemption — lets the challenge screen guard itself (no pending
   * challenge_token = no legitimate reason to be here) without exposing
   * the token itself, same pattern as StudentAuthContext's own
   * `hasPendingPasswordChange`. */
  hasPendingTwoFactorChallenge: boolean
  /** Only callable after `login()` returned a challenge — uses the
   * challenge_token held in context state, never a caller-supplied one. */
  completeTwoFactorChallenge: (code: string) => Promise<UserSummary>
  /** Same as `completeTwoFactorChallenge`, via a backup recovery code
   * instead of the emailed OTP (Scenario 4). */
  completeTwoFactorBackupCode: (backupCode: string) => Promise<UserSummary>
  /** Read-only peek at the in-flight challenge_token — needed by the
   * "Resend code" action, which calls a public endpoint directly (no
   * session exists yet to gate it behind). */
  pendingTwoFactorChallengeToken: string | null
  /** FR-003 — reflects a session obtained from an endpoint OTHER than
   * this context's own `login()` (account activation issues a full
   * session directly, per the same challenge-then-full-access pattern
   * FR-002 established) — purely additive, `login()`'s own behavior is
   * unchanged. */
  setSession: (accessToken: string, user: UserSummary) => void
  /** FR-050 review round 1, Major finding #3: `user` in context is a
   * point-in-time snapshot from login — enabling/disabling 2FA changes
   * the server's own record but never this context's copy, so any
   * screen reading `user.two_factor_enabled` (TwoFactorSetupScreen's own
   * mode-sync effect, EmailRoleProfileScreen's Security row) goes stale
   * after a successful enable/disable and shows the wrong state until
   * the next full page load. Callers await this after any action that
   * changes something on `user` itself without reissuing a token. */
  refreshUser: () => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
