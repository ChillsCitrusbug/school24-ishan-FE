import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { ROLE_HOME_PATH } from './roleHome'

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
  const { user } = useAuth()

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
