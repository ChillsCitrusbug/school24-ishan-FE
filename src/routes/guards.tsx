import type { ReactNode } from 'react'

/**
 * Route-guard scaffold.
 *
 * Structure only — no real role/auth logic yet. Per agents/frontend.md,
 * Admin and Staff experiences must stay separated through route guards;
 * this placeholder is the shape future guards follow ("RequireAuth",
 * "RequireRole") once auth state exists. It currently passes children
 * through unchanged.
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

export function RequireRole({ children }: RequireRoleProps) {
  // TODO(per-ticket): once auth state exists, redirect/deny when the
  // current user's role is not in `allow`. Backend authorization remains
  // authoritative regardless of this check.
  return children
}
