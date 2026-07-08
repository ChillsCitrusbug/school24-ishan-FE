import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Spinner } from '@/components'
import { useAuth } from '@/features/auth/useAuth'
import { useStudentAuth } from '@/features/student-auth/useStudentAuth'
import { ROLE_HOME_PATH } from './roleHome'

/** Session-persistence addition: shown only while a persisted token's
 * own boot-time "who am I" check is still in flight — see
 * `AuthContextValue.isBootstrapping`'s own docstring. */
function BootstrappingIndicator() {
  return (
    <div role="status" aria-label="Loading your session" className="flex h-screen items-center justify-center">
      <Spinner className="h-6 w-6" />
    </div>
  )
}

/**
 * Route guard (FR-001). Per agents/frontend.md, Admin and Staff
 * experiences must stay separated through route guards — this is the
 * frontend UX layer only; backend authorization (`get_tenant_scope`,
 * per-endpoint checks) remains authoritative regardless of this check
 * (a client-side redirect is not a security boundary by itself).
 *
 * `Role` mirrors DATABASE_SCHEMA.dbml's `user_role` enum exactly (the
 * canonical 4-value account-type set) — students authenticate separately
 * (own `students` table, no `users.role` value) and are represented at
 * the route-guard layer by a distinct student session check once FR-002
 * exists, not by an entry in this union.
 */
export type Role = 'platform_admin' | 'school_admin' | 'staff' | 'parent'

interface RequireRoleProps {
  allow: Role[]
  children: ReactNode
}

export function RequireRole({ allow, children }: RequireRoleProps) {
  const { user, isBootstrapping } = useAuth()

  // Session-persistence addition: a page refresh's own boot-time "who
  // am I" check against a persisted token hasn't resolved yet — `user`
  // is still `null` here regardless of whether the session is actually
  // valid. Redirecting now would flash to /login on every refresh.
  if (isBootstrapping) {
    return <BootstrappingIndicator />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!allow.includes(user.role)) {
    // Signed in, but this route belongs to a different role — send them
    // to where they DO belong rather than an error state.
    return <Navigate to={ROLE_HOME_PATH[user.role]} replace />
  }

  return children
}

/** Student-only route guard (FR-002) — a separate identity type from
 * `RequireRole` above (students are not `users` rows), so a separate
 * context/guard rather than folding a 5th value into `Role`. */
export function RequireStudent({ children }: { children: ReactNode }) {
  const { student, isBootstrapping } = useStudentAuth()

  if (isBootstrapping) {
    return <BootstrappingIndicator />
  }

  if (!student) {
    return <Navigate to="/student-login" replace />
  }

  return children
}
