import type { RouteObject } from 'react-router-dom'
import { ActivateAccountScreen } from './ActivateAccountScreen'
import { AddChildScreen } from './AddChildScreen'
import { AllOrdersScreen } from './AllOrdersScreen'
import { ApprovalQueueScreen } from './ApprovalQueueScreen'
import { AssignRoleScreen } from './AssignRoleScreen'
import { ChildSelectScreen } from './ChildSelectScreen'
import { ChildWalletTopUpScreen } from './ChildWalletTopUpScreen'
import { CancelOrderScreen } from './CancelOrderScreen'
import { CartScreen } from './CartScreen'
import { FoodRestrictionsScreen } from './FoodRestrictionsScreen'
import { ItemDetailScreen } from './ItemDetailScreen'
import { ParentInboxScreen } from './ParentInboxScreen'
import { StaffInboxScreen } from './StaffInboxScreen'
import { StudentInboxScreen } from './StudentInboxScreen'
import { ClassDeleteScreen } from './ClassDeleteScreen'
import { ClassDetailScreen } from './ClassDetailScreen'
import { ClassFormScreen } from './ClassFormScreen'
import { ClassesListScreen } from './ClassesListScreen'
import { ComboFormScreen } from './ComboFormScreen'
import { CombosListScreen } from './CombosListScreen'
import { ComposeNotificationScreen } from './ComposeNotificationScreen'
import { ConfirmEmailChangeScreen } from './ConfirmEmailChangeScreen'
import { ExportOrdersScreen } from './ExportOrdersScreen'
import { ForgotPasswordScreen } from './ForgotPasswordScreen'
import { FulfilmentBoardScreen } from './FulfilmentBoardScreen'
import { GuardiansScreen } from './GuardiansScreen'
import { RequireRole, RequireStudent } from './guards'
import { LinkRequestReviewScreen } from './LinkRequestReviewScreen'
import { LoginScreen } from './LoginScreen'
import { MenuBrowseScreen } from './MenuBrowseScreen'
import { MenuDisplayOrderScreen } from './MenuDisplayOrderScreen'
import { MyChildrenScreen } from './MyChildrenScreen'
import { OnboardSchoolScreen } from './OnboardSchoolScreen'
import { OrderDetailScreen } from './OrderDetailScreen'
import { PaProfileScreen } from './PaProfileScreen'
import { ParentCartScreen } from './ParentCartScreen'
import { ParentCheckoutScreen } from './ParentCheckoutScreen'
import { ParentItemDetailScreen } from './ParentItemDetailScreen'
import { ParentMenuBrowseScreen } from './ParentMenuBrowseScreen'
import { ParentOrderHistoryScreen } from './ParentOrderHistoryScreen'
import { ParentOrderTrackingScreen } from './ParentOrderTrackingScreen'
import { ParentProfileScreen } from './ParentProfileScreen'
import { ParentHomeScreen } from './ParentHomeScreen'
import { ParentTxnHistoryScreen } from './ParentTxnHistoryScreen'
import { ParentWalletScreen } from './ParentWalletScreen'
import { ParentWalletTopUpScreen } from './ParentWalletTopUpScreen'
import { PlatformDashboardScreen } from './PlatformDashboardScreen'
import { ProductFormScreen } from './ProductFormScreen'
import { ProductSalesScreen } from './ProductSalesScreen'
import { ProductsListScreen } from './ProductsListScreen'
import { ReceiptScreen } from './ReceiptScreen'
import { RegisterScreen } from './RegisterScreen'
import { ReportsScreen } from './ReportsScreen'
import { ResetPasswordScreen } from './ResetPasswordScreen'
import { RoleBuilderScreen } from './RoleBuilderScreen'
import { RoleDeleteScreen } from './RoleDeleteScreen'
import { RolesListScreen } from './RolesListScreen'
import { RootRedirect } from './RootRedirect'
import { SaProfileScreen } from './SaProfileScreen'
import { SchoolAdminDashboard } from './SchoolAdminDashboard'
import { SchoolDetailScreen } from './SchoolDetailScreen'
import { SchoolsListScreen } from './SchoolsListScreen'
import { SentLogScreen } from './SentLogScreen'
import { SpendingReportScreen } from './SpendingReportScreen'
import { StaffDetailScreen } from './StaffDetailScreen'
import { StaffFormScreen } from './StaffFormScreen'
import { StaffListScreen } from './StaffListScreen'
import { StaffPortalScreen } from './StaffPortalScreen'
import { StaffProfileScreen } from './StaffProfileScreen'
import { StaffStatusScreen } from './StaffStatusScreen'
import { StudentCheckoutScreen } from './StudentCheckoutScreen'
import { StudentCredentialsScreen } from './StudentCredentialsScreen'
import { StudentDeleteScreen } from './StudentDeleteScreen'
import { StudentDetailScreen } from './StudentDetailScreen'
import { StudentFirstLoginScreen } from './StudentFirstLoginScreen'
import { StudentFormScreen } from './StudentFormScreen'
import { StudentHomeScreen } from './StudentHomeScreen'
import { StudentLoginScreen } from './StudentLoginScreen'
import { StudentOrderHistoryScreen } from './StudentOrderHistoryScreen'
import { StudentOrderTrackingScreen } from './StudentOrderTrackingScreen'
import { StudentProfileScreen } from './StudentProfileScreen'
import { StudentTxnHistoryScreen } from './StudentTxnHistoryScreen'
import { StudentStatusScreen } from './StudentStatusScreen'
import { StudentResetCredentialScreen } from './StudentResetCredentialScreen'
import { StudentWalletScreen } from './StudentWalletScreen'
import { StudentWalletTopUpScreen } from './StudentWalletTopUpScreen'
import { StudentsListScreen } from './StudentsListScreen'
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
        <StudentHomeScreen />
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
    path: '/student/wallet',
    element: (
      <RequireStudent>
        <StudentWalletScreen />
      </RequireStudent>
    ),
  },
  {
    path: '/student/wallet/history',
    element: (
      <RequireStudent>
        <StudentTxnHistoryScreen />
      </RequireStudent>
    ),
  },
  {
    path: '/student/menu',
    element: (
      <RequireStudent>
        <MenuBrowseScreen />
      </RequireStudent>
    ),
  },
  {
    path: '/student/menu/products/:productId',
    element: (
      <RequireStudent>
        <ItemDetailScreen itemType="product" />
      </RequireStudent>
    ),
  },
  {
    path: '/student/menu/combos/:comboId',
    element: (
      <RequireStudent>
        <ItemDetailScreen itemType="combo" />
      </RequireStudent>
    ),
  },
  {
    path: '/student/cart',
    element: (
      <RequireStudent>
        <CartScreen />
      </RequireStudent>
    ),
  },
  {
    path: '/student/checkout',
    element: (
      <RequireStudent>
        <StudentCheckoutScreen />
      </RequireStudent>
    ),
  },
  {
    path: '/student/checkout/receipt',
    element: (
      <RequireStudent>
        <ReceiptScreen />
      </RequireStudent>
    ),
  },
  {
    path: '/student/orders',
    element: (
      <RequireStudent>
        <StudentOrderHistoryScreen />
      </RequireStudent>
    ),
  },
  {
    path: '/student/orders/:orderId',
    element: (
      <RequireStudent>
        <StudentOrderTrackingScreen />
      </RequireStudent>
    ),
  },
  {
    path: '/platform-admin',
    element: (
      <RequireRole allow={['platform_admin']}>
        <PlatformDashboardScreen />
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
    path: '/school-admin/classes',
    element: (
      <RequireRole allow={['school_admin']}>
        <ClassesListScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/classes/new',
    element: (
      <RequireRole allow={['school_admin']}>
        <ClassFormScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/classes/:classId',
    element: (
      <RequireRole allow={['school_admin']}>
        <ClassDetailScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/classes/:classId/edit',
    element: (
      <RequireRole allow={['school_admin']}>
        <ClassFormScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/classes/:classId/delete',
    element: (
      <RequireRole allow={['school_admin']}>
        <ClassDeleteScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/students',
    element: (
      <RequireRole allow={['school_admin']}>
        <StudentsListScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/students/new',
    element: (
      <RequireRole allow={['school_admin']}>
        <StudentFormScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/students/credentials',
    element: (
      <RequireRole allow={['school_admin']}>
        <StudentCredentialsScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/students/:studentId',
    element: (
      <RequireRole allow={['school_admin']}>
        <StudentDetailScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/students/:studentId/edit',
    element: (
      <RequireRole allow={['school_admin']}>
        <StudentFormScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/students/:studentId/delete',
    element: (
      <RequireRole allow={['school_admin']}>
        <StudentDeleteScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/students/:studentId/reset-credential',
    element: (
      <RequireRole allow={['school_admin']}>
        <StudentResetCredentialScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/students/:studentId/status',
    element: (
      <RequireRole allow={['school_admin']}>
        <StudentStatusScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/students/:studentId/guardians',
    element: (
      <RequireRole allow={['school_admin']}>
        <GuardiansScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/approvals',
    element: (
      <RequireRole allow={['school_admin', 'staff']}>
        <ApprovalQueueScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/orders',
    element: (
      <RequireRole allow={['school_admin', 'staff']}>
        <FulfilmentBoardScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/orders/all',
    element: (
      <RequireRole allow={['school_admin']}>
        <AllOrdersScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/orders/export',
    element: (
      <RequireRole allow={['school_admin']}>
        <ExportOrdersScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/orders/:orderId',
    element: (
      <RequireRole allow={['school_admin', 'staff']}>
        <OrderDetailScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/orders/:orderId/cancel',
    element: (
      <RequireRole allow={['school_admin', 'staff']}>
        <CancelOrderScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/reports',
    element: (
      <RequireRole allow={['school_admin']}>
        <ReportsScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/reports/products',
    element: (
      <RequireRole allow={['school_admin']}>
        <ProductSalesScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/approvals/:linkId',
    element: (
      <RequireRole allow={['school_admin', 'staff']}>
        <LinkRequestReviewScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/products',
    element: (
      <RequireRole allow={['school_admin', 'staff']}>
        <ProductsListScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/products/new',
    element: (
      <RequireRole allow={['school_admin', 'staff']}>
        <ProductFormScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/products/:productId/edit',
    element: (
      <RequireRole allow={['school_admin', 'staff']}>
        <ProductFormScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/products/order',
    element: (
      <RequireRole allow={['school_admin', 'staff']}>
        <MenuDisplayOrderScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/notifications',
    element: (
      <RequireRole allow={['school_admin', 'staff']}>
        <SentLogScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/notifications/new',
    element: (
      <RequireRole allow={['school_admin', 'staff']}>
        <ComposeNotificationScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/combos',
    element: (
      <RequireRole allow={['school_admin', 'staff']}>
        <CombosListScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/combos/new',
    element: (
      <RequireRole allow={['school_admin', 'staff']}>
        <ComboFormScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/combos/:comboId/edit',
    element: (
      <RequireRole allow={['school_admin', 'staff']}>
        <ComboFormScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/staff',
    element: (
      <RequireRole allow={['school_admin']}>
        <StaffListScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/staff/new',
    element: (
      <RequireRole allow={['school_admin']}>
        <StaffFormScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/staff/:staffId',
    element: (
      <RequireRole allow={['school_admin']}>
        <StaffDetailScreen />
      </RequireRole>
    ),
  },
  {
    path: '/school-admin/staff/:staffId/edit',
    element: (
      <RequireRole allow={['school_admin']}>
        <StaffFormScreen />
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
    path: '/school-admin/staff/:staffId/status',
    element: (
      <RequireRole allow={['school_admin']}>
        <StaffStatusScreen />
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
        <ParentHomeScreen />
      </RequireRole>
    ),
  },
  {
    path: '/parent/children/add',
    element: (
      <RequireRole allow={['parent']}>
        <AddChildScreen />
      </RequireRole>
    ),
  },
  {
    path: '/parent/select-child',
    element: (
      <RequireRole allow={['parent']}>
        <ChildSelectScreen />
      </RequireRole>
    ),
  },
  {
    path: '/parent/children',
    element: (
      <RequireRole allow={['parent']}>
        <MyChildrenScreen />
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
    path: '/parent/wallet/top-up-child',
    element: (
      <RequireRole allow={['parent']}>
        <ChildWalletTopUpScreen />
      </RequireRole>
    ),
  },
  {
    path: '/parent/food-restrictions',
    element: (
      <RequireRole allow={['parent']}>
        <FoodRestrictionsScreen />
      </RequireRole>
    ),
  },
  {
    path: '/parent/menu',
    element: (
      <RequireRole allow={['parent']}>
        <ParentMenuBrowseScreen />
      </RequireRole>
    ),
  },
  {
    path: '/parent/menu/products/:productId',
    element: (
      <RequireRole allow={['parent']}>
        <ParentItemDetailScreen itemType="product" />
      </RequireRole>
    ),
  },
  {
    path: '/parent/menu/combos/:comboId',
    element: (
      <RequireRole allow={['parent']}>
        <ParentItemDetailScreen itemType="combo" />
      </RequireRole>
    ),
  },
  {
    path: '/parent/cart',
    element: (
      <RequireRole allow={['parent']}>
        <ParentCartScreen />
      </RequireRole>
    ),
  },
  {
    path: '/parent/checkout',
    element: (
      <RequireRole allow={['parent']}>
        <ParentCheckoutScreen />
      </RequireRole>
    ),
  },
  {
    path: '/parent/checkout/receipt',
    element: (
      <RequireRole allow={['parent']}>
        <ReceiptScreen />
      </RequireRole>
    ),
  },
  {
    path: '/parent/orders',
    element: (
      <RequireRole allow={['parent']}>
        <ParentOrderHistoryScreen />
      </RequireRole>
    ),
  },
  {
    path: '/parent/orders/:orderId',
    element: (
      <RequireRole allow={['parent']}>
        <ParentOrderTrackingScreen />
      </RequireRole>
    ),
  },
  {
    path: '/parent/inbox',
    element: (
      <RequireRole allow={['parent']}>
        <ParentInboxScreen />
      </RequireRole>
    ),
  },
  {
    path: '/staff/inbox',
    element: (
      <RequireRole allow={['staff']}>
        <StaffInboxScreen />
      </RequireRole>
    ),
  },
  {
    path: '/student/inbox',
    element: (
      <RequireStudent>
        <StudentInboxScreen />
      </RequireStudent>
    ),
  },
  {
    path: '/parent/wallet',
    element: (
      <RequireRole allow={['parent']}>
        <ParentWalletScreen />
      </RequireRole>
    ),
  },
  {
    path: '/parent/wallet/history',
    element: (
      <RequireRole allow={['parent']}>
        <ParentTxnHistoryScreen />
      </RequireRole>
    ),
  },
  {
    path: '/parent/spending-report',
    element: (
      <RequireRole allow={['parent']}>
        <SpendingReportScreen />
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
