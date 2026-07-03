import type { RouteObject } from 'react-router-dom'
import { ActivateAccountScreen } from './ActivateAccountScreen'
import { AssignRoleScreen } from './AssignRoleScreen'
import { ConfirmEmailChangeScreen } from './ConfirmEmailChangeScreen'
import { ForgotPasswordScreen } from './ForgotPasswordScreen'
import { RequireRole, RequireStudent } from './guards'
import { LoginScreen } from './LoginScreen'
import { OnboardSchoolScreen } from './OnboardSchoolScreen'
import { PaProfileScreen } from './PaProfileScreen'
import { ParentProfileScreen } from './ParentProfileScreen'
import { ParentWalletTopUpScreen } from './ParentWalletTopUpScreen'
import { PlaceholderDashboard } from './PlaceholderDashboard'
import { RegisterScreen } from './RegisterScreen'
import { ResetPasswordScreen } from './ResetPasswordScreen'
import { RoleBuilderScreen } from './RoleBuilderScreen'
import { RoleDeleteScreen } from './RoleDeleteScreen'
import { RolesListScreen } from './RolesListScreen'
import { RootRedirect } from './RootRedirect'
import { SaProfileScreen } from './SaProfileScreen'
import { SchoolAdminDashboard } from './SchoolAdminDashboard'
import { SchoolDetailScreen } from './SchoolDetailScreen'
import { SchoolsListScreen } from './SchoolsListScreen'
import { StaffPortalScreen } from './StaffPortalScreen'
import { StaffProfileScreen } from './StaffProfileScreen'
import { StudentFirstLoginScreen } from './StudentFirstLoginScreen'
import { StudentLoginScreen } from './StudentLoginScreen'
import { StudentPlaceholderHome } from './StudentPlaceholderHome'
import { StudentProfileScreen } from './StudentProfileScreen'
import { StudentWalletTopUpScreen } from './StudentWalletTopUpScreen'
import { TwoFactorChallengeScreen } from './TwoFactorChallengeScreen'
import { TwoFactorSetupScreen } from './TwoFactorSetupScreen'
import { UserDetailScreen } from './UserDetailScreen'
import { UsersListScreen } from './UsersListScreen'
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
  { path: '/forgot-password', element: <ForgotPasswordScreen /> },
  { path: '/reset-password', element: <ResetPasswordScreen /> },
  { path: '/confirm-email-change', element: <ConfirmEmailChangeScreen /> },
  { path: '/two-factor-challenge', element: <TwoFactorChallengeScreen /> },
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
    path: '/student/profile',
    element: (
      <RequireStudent>
        <StudentProfileScreen />
      </RequireStudent>
    ),
  },
  {
    path: '/student/wallet/top-up',
    element: (
      <RequireStudent>
        <StudentWalletTopUpScreen />
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
    path: '/platform-admin/profile',
    element: (
      <RequireRole allow={['platform_admin']}>
        <PaProfileScreen />
      </RequireRole>
    ),
  },
  {
    path: '/platform-admin/schools',
    element: (
      <RequireRole allow={['platform_admin']}>
        <SchoolsListScreen />
      </RequireRole>
    ),
  },
  {
    path: '/platform-admin/schools/new',
    element: (
      <RequireRole allow={['platform_admin']}>
        <OnboardSchoolScreen />
      </RequireRole>
    ),
  },
  {
    path: '/platform-admin/schools/:schoolId',
    element: (
      <RequireRole allow={['platform_admin']}>
        <SchoolDetailScreen />
      </RequireRole>
    ),
  },
  {
    path: '/platform-admin/users',
    element: (
      <RequireRole allow={['platform_admin']}>
        <UsersListScreen />
      </RequireRole>
    ),
  },
  {
    path: '/platform-admin/users/:userId',
    element: (
      <RequireRole allow={['platform_admin']}>
        <UserDetailScreen />
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
    path: '/school-admin/profile',
    element: (
      <RequireRole allow={['school_admin']}>
        <SaProfileScreen />
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
    path: '/staff/profile',
    element: (
      <RequireRole allow={['staff']}>
        <StaffProfileScreen />
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
  {
    path: '/parent/profile',
    element: (
      <RequireRole allow={['parent']}>
        <ParentProfileScreen />
      </RequireRole>
    ),
  },
  {
    path: '/parent/wallet/top-up',
    element: (
      <RequireRole allow={['parent']}>
        <ParentWalletTopUpScreen />
      </RequireRole>
    ),
  },
  {
    path: '/two-factor-setup',
    element: (
      <RequireRole allow={['platform_admin', 'school_admin', 'staff', 'parent']}>
        <TwoFactorSetupScreen />
      </RequireRole>
    ),
  },
  { path: '*', element: <NotFoundPage /> },
]
