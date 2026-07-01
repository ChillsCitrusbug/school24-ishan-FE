import type { RouteObject } from 'react-router-dom'

/**
 * Route table scaffold.
 *
 * No feature routes exist yet — each ticket adds its own routes here (or
 * to feature-scoped route modules composed into this table). A single
 * placeholder `/` route keeps the router provider functional until then.
 *
 * "Keep Admin and Staff experiences separated through route guards"
 * (agents/frontend.md) — see `./guards.tsx` (`RequireRole`) for the
 * guard-pattern placeholder; real role checks land with the first
 * authenticated route.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: null,
  },
]
