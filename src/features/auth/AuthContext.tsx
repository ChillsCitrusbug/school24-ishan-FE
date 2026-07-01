import { useCallback, useState, type ReactNode } from 'react'
import { clearAccessToken, setAccessToken } from '@/lib/auth-token'
import { login as loginRequest, type UserSummary } from './api'
import { AuthContext } from './context'

/**
 * FR-001 — the single source of truth for "who is signed in right now".
 *
 * The access token itself lives only in `src/lib/auth-token.ts`'s
 * in-memory store (never localStorage, per agents/frontend.md); this
 * context additionally holds the resolved user summary so routes can make
 * role-based decisions (`RequireRole`) without re-decoding the JWT.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const login = useCallback(async (email: string, password: string) => {
    setIsAuthenticating(true)
    try {
      const result = await loginRequest(email, password)
      setAccessToken(result.access_token)
      setUser(result.user)
      return result.user
    } finally {
      setIsAuthenticating(false)
    }
  }, [])

  const logout = useCallback(() => {
    clearAccessToken()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticating, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
