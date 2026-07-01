import type { RouteObject } from 'react-router-dom'
import { RequireRole, RequireStudent } from './guards'
import { LoginScreen } from './LoginScreen'
import { PlaceholderDashboard } from './PlaceholderDashboard'
import { RootRedirect } from './RootRedirect'
import { SchoolAdminDashboard } from './SchoolAdminDashboard'
import { StudentFirstLoginScreen } from './StudentFirstLoginScreen'
import { StudentLoginScreen } from './StudentLoginScreen'
import { StudentPlaceholderHome } from './StudentPlaceholderHome'
import {
  BlockedPage,
  MaintenancePage,
  NotFoundPage,
  ServerErrorPage,
  SessionExpiredPage,
} from './SystemPages'

/**
 * Route table (FR-001, extended by FR-002 for the student identity type).
 * Public routes (login + system pages) are always reachable; every
 * role-home route is wrapped in `RequireRole`/`RequireStudent` — see
 * `./guards.tsx`. `/` never renders content itself, only redirects
 * (`RootRedirect`) to whichever identity is signed in, or to `/login`.
 */
export const routes: RouteObject[] = [
  { path: '/', element: <RootRedirect /> },
  { path: '/login', element: <LoginScreen /> },
  { path: '/student-login', element: <StudentLoginScreen /> },
  { path: '/student-first-login', element: <StudentFirstLoginScreen /> },
  { path: '/session-expired', element: <SessionExpiredPage state="expired" /> },
  { path: '/signed-out', element: <SessionExpiredPage state="logged-out" /> },
  { path: '/blocked', element: <BlockedPage state="deactivated" /> },
  { path: '/server-error', element: <ServerErrorPage /> },
  { path: '/maintenance', element: <MaintenancePage /> },
  {
    path: '/student',
    element: (
      <RequireStudent>
        <StudentPlaceholderHome />
      </RequireStudent>
    ),
  },
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
