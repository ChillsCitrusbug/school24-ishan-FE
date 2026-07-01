import { createContext } from 'react'
import type { UserSummary } from './api'

export interface AuthContextValue {
  user: UserSummary | null
  isAuthenticating: boolean
  /** Returns the resolved user directly — callers navigating right after
   * login should use this return value, not `user`, since the context's
   * state update hasn't re-rendered yet inside the same event handler. */
  login: (email: string, password: string) => Promise<UserSummary>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
