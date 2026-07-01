import type { RouteObject } from 'react-router-dom'
import { RequireRole } from './guards'
import { LoginScreen } from './LoginScreen'
import { PlaceholderDashboard } from './PlaceholderDashboard'
import { RootRedirect } from './RootRedirect'
import { SchoolAdminDashboard } from './SchoolAdminDashboard'
import {
  BlockedPage,
  MaintenancePage,
  NotFoundPage,
  ServerErrorPage,
  SessionExpiredPage,
} from './SystemPages'

/**
 * Route table (FR-001). Public routes (login + system pages) are always
 * reachable; every role-home route is wrapped in `RequireRole` — see
 * `./guards.tsx`. `/` never renders content itself, only redirects
 * (`RootRedirect`) to the signed-in role's home or to `/login`.
 */
export const routes: RouteObject[] = [
  { path: '/', element: <RootRedirect /> },
  { path: '/login', element: <LoginScreen /> },
  { path: '/session-expired', element: <SessionExpiredPage state="expired" /> },
  { path: '/signed-out', element: <SessionExpiredPage state="logged-out" /> },
  { path: '/blocked', element: <BlockedPage state="deactivated" /> },
  { path: '/server-error', element: <ServerErrorPage /> },
  { path: '/maintenance', element: <MaintenancePage /> },
  {
    path: '/platform-admin',
    element: (
      <RequireRole allow={['platform_admin']}>
        <PlaceholderDashboard />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin',
    element: (
      <RequireRole allow={['school_admin']}>
        <SchoolAdminDashboard />
      </RequireRole>
    ),
  },
  {
    path: '/staff',
    element: (
      <RequireRole allow={['staff']}>
        <PlaceholderDashboard />
      </RequireRole>
    ),
  },
  {
    path: '/parent',
    element: (
      <RequireRole allow={['parent']}>
        <PlaceholderDashboard />
      </RequireRole>
    ),
  },
  { path: '*', element: <NotFoundPage /> },
]
