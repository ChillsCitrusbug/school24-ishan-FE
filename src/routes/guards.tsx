import type { ReactNode } from 'react'

/**
 * Route-guard scaffold.
 *
 * Structure only — no real role/auth logic yet. Per agents/frontend.md,
 * Admin and Staff experiences must stay separated through route guards;
 * this placeholder is the shape future guards follow ("RequireAuth",
 * "RequireRole") once auth state exists. It currently passes children
 * through unchanged.
 */
export type Role = 'admin' | 'staff'

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
