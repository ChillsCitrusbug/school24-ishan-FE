import { createContext } from 'react'
import type { UserSummary } from './api'

export interface AuthContextValue {
  user: UserSummary | null
  isAuthenticating: boolean
  /** Returns the resolved user directly — callers navigating right after
   * login should use this return value, not `user`, since the context's
   * state update hasn't re-rendered yet inside the same event handler. */
  login: (email: string, password: string) => Promise<UserSummary>
  /** FR-003 — reflects a session obtained from an endpoint OTHER than
   * this context's own `login()` (account activation issues a full
   * session directly, per the same challenge-then-full-access pattern
   * FR-002 established) — purely additive, `login()`'s own behavior is
   * unchanged. */
  setSession: (accessToken: string, user: UserSummary) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
