import { createContext } from 'react'
import type { StudentLoginResult, StudentSummary } from './api'

export interface StudentAuthContextValue {
  student: StudentSummary | null
  isAuthenticating: boolean
  /** True only between a first-login challenge and its redemption — lets
   * the first-login screen guard itself (no pending change_token = no
   * legitimate reason to be here, redirect back to /student-login)
   * without exposing the token itself. */
  hasPendingPasswordChange: boolean
  /** Returns the raw login result — callers check
   * `'must_change_password' in result` to decide whether to navigate to
   * the forced first-login screen or straight to the student home. */
  login: (studentId: string, password: string) => Promise<StudentLoginResult>
  /** Only callable after `login()` returned a challenge — uses the
   * change_token held in context state, never a caller-supplied one, so a
   * screen can't accidentally submit against a stale/wrong token. */
  completePasswordChange: (newPassword: string, confirmPassword: string) => Promise<StudentSummary>
  logout: () => void
  /** Session-persistence addition: `true` only while a persisted
   * token's own boot-time "who am I" check is still in flight — see
   * `AuthContextValue`'s own identical field for the full reasoning. */
  isBootstrapping: boolean
}

export const StudentAuthContext = createContext<StudentAuthContextValue | null>(null)
