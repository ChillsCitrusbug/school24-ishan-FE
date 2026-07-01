import { createElement } from 'react'
import type { RouteObject } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { RequireRole, type Role } from './guards'

/**
 * Route table scaffold.
 *
 * No feature routes exist yet — each ticket adds its own routes here (or
 * to feature-scoped route modules composed into this table) as children of
 * the guarded shell below.
 *
 * "Keep Admin and Staff experiences separated through route guards"
 * (agents/frontend.md) — `RequireRole` (`./guards.tsx`) is the guard-
 * pattern placeholder; real role checks land with the first authenticated
 * route (FR-001/002/004). `AppLayout` wires the shared AppShell/Sidebar/
 * Topbar/MobileTabBar design-system shell (INFRA-000) around every guarded
 * route via an `<Outlet />`.
 */
const ALL_ROLES: Role[] = ['platform_admin', 'school_admin', 'staff', 'parent']

export const routes: RouteObject[] = [
  {
    path: '/',
    element: createElement(RequireRole, { allow: ALL_ROLES, children: createElement(AppLayout) }),
    children: [{ index: true, element: null }],
  },
]
