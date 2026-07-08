import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  beginRehydration,
  clearAccessToken,
  endRehydration,
  getAccessToken,
  setAccessToken,
} from '@/lib/auth-token'
import {
  changePassword as changePasswordRequest,
  getMe,
  login as loginRequest,
  type StudentSummary,
} from './api'
import { StudentAuthContext } from './context'

/**
 * FR-002 — the single source of truth for "which student is signed in
 * right now", mirroring src/features/auth/AuthContext.tsx's shape for the
 * (entirely separate) student identity type.
 *
 * The in-flight change_token itself (between a first-login challenge and
 * the password-change call that redeems it) is held in a ref — it is
 * never rendered and only ever read by `completePasswordChange`.
 * `hasPendingPasswordChange` is the state twin that IS exposed, so the
 * first-login screen can guard itself without the token leaking into
 * anything that renders it.
 *
 * `isBootstrapping` mirrors `AuthProvider`'s own identical field — see
 * that provider's docstring for the full reasoning (a page refresh
 * must not flash-redirect `RequireStudent` to `/student-login` before
 * the boot-time "who am I" check below has resolved).
 */
export function StudentAuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<StudentSummary | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(() => getAccessToken() !== null)
  const [hasPendingPasswordChange, setHasPendingPasswordChange] = useState(false)
  const pendingChangeToken = useRef<string | null>(null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    beginRehydration()
    getMe()
      .then(setStudent)
      .catch(() => {
        // Either a genuinely expired/invalid token, or this persisted
        // token actually belongs to a User (Parent/SA/Staff/PA) session
        // — AuthProvider's own boot check handles that case; this
        // provider silently stays signed-out, no token cleared here.
      })
      .finally(() => {
        endRehydration()
        setIsBootstrapping(false)
      })
  }, [])

  const login = useCallback(async (studentId: string, password: string) => {
    setIsAuthenticating(true)
    try {
      const result = await loginRequest(studentId, password)
      if ('must_change_password' in result) {
        pendingChangeToken.current = result.change_token
        setHasPendingPasswordChange(true)
      } else {
        pendingChangeToken.current = null
        setHasPendingPasswordChange(false)
        setAccessToken(result.access_token)
        setStudent(result.student)
      }
      return result
    } finally {
      setIsAuthenticating(false)
    }
  }, [])

  const completePasswordChange = useCallback(
    async (newPassword: string, confirmPassword: string) => {
      const changeToken = pendingChangeToken.current
      if (!changeToken) {
        throw new Error('completePasswordChange called with no pending change_token')
      }
      setIsAuthenticating(true)
      try {
        const result = await changePasswordRequest(changeToken, newPassword, confirmPassword)
        pendingChangeToken.current = null
        setHasPendingPasswordChange(false)
        setAccessToken(result.access_token)
        setStudent(result.student)
        return result.student
      } finally {
        setIsAuthenticating(false)
      }
    },
    [],
  )

  const logout = useCallback(() => {
    clearAccessToken()
    pendingChangeToken.current = null
    setHasPendingPasswordChange(false)
    setStudent(null)
  }, [])

  return (
    <StudentAuthContext.Provider
      value={{
        student,
        isAuthenticating,
        hasPendingPasswordChange,
        login,
        completePasswordChange,
        logout,
        isBootstrapping,
      }}
    >
      {children}
    </StudentAuthContext.Provider>
  )
}
