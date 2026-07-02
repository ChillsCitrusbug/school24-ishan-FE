import type { RouteObject } from 'react-router-dom'
import { ActivateAccountScreen } from './ActivateAccountScreen'
import { AssignRoleScreen } from './AssignRoleScreen'
import { RequireRole, RequireStudent } from './guards'
import { LoginScreen } from './LoginScreen'
import { PlaceholderDashboard } from './PlaceholderDashboard'
import { RegisterScreen } from './RegisterScreen'
import { RoleBuilderScreen } from './RoleBuilderScreen'
import { RoleDeleteScreen } from './RoleDeleteScreen'
import { RolesListScreen } from './RolesListScreen'
import { RootRedirect } from './RootRedirect'
import { SchoolAdminDashboard } from './SchoolAdminDashboard'
import { StaffPortalScreen } from './StaffPortalScreen'
import { StudentFirstLoginScreen } from './StudentFirstLoginScreen'
import { StudentLoginScreen } from './StudentLoginScreen'
import { StudentPlaceholderHome } from './StudentPlaceholderHome'
import {
  BlockedPage,
  MaintenancePage,
  NotFoundPage,
  RegistrationSentPage,
  ServerErrorPage,
  SessionExpiredPage,
} from './SystemPages'
import { VerifyEmailScreen } from './VerifyEmailScreen'

/**
 * Route table (FR-001, extended by FR-002 for the student identity type,
 * FR-004 for parent self-registration + email verification, FR-003 for
 * SA/Staff account activation via invitation link).
 * Public routes (login + system pages) are always reachable; every
 * role-home route is wrapped in `RequireRole`/`RequireStudent` — see
 * `./guards.tsx`. `/` never renders content itself, only redirects
 * (`RootRedirect`) to whichever identity is signed in, or to `/login`.
 */
export const routes: RouteObject[] = [
  { path: '/', element: <RootRedirect /> },
  { path: '/login', element: <LoginScreen /> },
  { path: '/register', element: <RegisterScreen /> },
  { path: '/registration-sent', element: <RegistrationSentPage /> },
  { path: '/verify-email', element: <VerifyEmailScreen /> },
  { path: '/activate', element: <ActivateAccountScreen /> },
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
    path: '/school-admin/roles',
    element: (
      <RequireRole allow={['school_admin']}>
        <RolesListScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/roles/new',
    element: (
      <RequireRole allow={['school_admin']}>
        <RoleBuilderScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/roles/:roleId/edit',
    element: (
      <RequireRole allow={['school_admin']}>
        <RoleBuilderScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/roles/:roleId/delete',
    element: (
      <RequireRole allow={['school_admin']}>
        <RoleDeleteScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/staff/:staffId/assign-role',
    element: (
      <RequireRole allow={['school_admin']}>
        <AssignRoleScreen />
      </RequireRole>
    ),
  },
  {
    path: '/staff',
    element: (
      <RequireRole allow={['staff']}>
        <StaffPortalScreen />
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
