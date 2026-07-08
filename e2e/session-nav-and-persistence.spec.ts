// Direct product requests (2026-07-08), outside any ticket — real
// end-to-end coverage of 4 cross-cutting changes:
//   1. The sidebar's own brand logo always navigates back to the
//      signed-in role's own home, from any nested screen.
//   2. A real Logout button exists in the topbar and genuinely clears
//      the session (a follow-up visit to a protected route redirects
//      to /login again, not just a navigated-away screen).
//   3. A REAL browser refresh (page.reload()) does not sign the user
//      out — sessionStorage-backed persistence, the core ask. This is
//      the single most important assertion in this file.
//   4. The Student <-> Parent/Admin login cross-links both work.

import { test, expect } from '@playwright/test'

const SA_EMAIL = process.env.FR045_SA_EMAIL ?? 'batch3-sa@example.com'
const SA_PASSWORD = process.env.FR045_SA_PASSWORD ?? 'VisualCheck123!'

test('sidebar brand title navigates back to the role home from a nested screen', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(SA_EMAIL)
  await page.getByLabel('Password').fill(SA_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')

  await page.evaluate(() => {
    window.history.pushState({}, '', '/school-admin/reports')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/school-admin/reports')
  await expect(page.getByText('Operational reports')).toBeVisible()

  await page.getByRole('link', { name: /school24/i }).click()

  await page.waitForFunction(() => window.location.pathname === '/school-admin')
})

test('a real Logout button clears the session and a protected route redirects to login again', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(SA_EMAIL)
  await page.getByLabel('Password').fill(SA_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')

  await page.getByRole('button', { name: /log out/i }).click()
  await page.waitForURL('**/login')
  await expect(page.getByText('Welcome back')).toBeVisible()

  // A genuinely cleared session, not just a navigated-away screen —
  // going straight to a protected route now redirects back to /login.
  await page.goto('/school-admin')
  await page.waitForURL('**/login')
})

test('a real browser refresh does not sign the user out', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(SA_EMAIL)
  await page.getByLabel('Password').fill(SA_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')
  await expect(page.getByText(/let.s set up your school|operational reports|dashboard/i).first()).toBeVisible()

  await page.reload()

  // The core ask: still on /school-admin, not bounced to /login.
  await expect(page).toHaveURL(/\/school-admin/)
  await expect(page.getByText('Welcome back')).not.toBeVisible()
  await expect(page.getByRole('button', { name: /log out/i })).toBeVisible()
})

test('the Student <-> Parent/Admin login cross-links both navigate correctly', async ({
  page,
}) => {
  await page.goto('/student-login')
  await expect(page.getByText('Student sign in')).toBeVisible()

  await page.getByRole('link', { name: /Platform Login/i }).click()
  await page.waitForURL('**/login')
  await expect(page.getByText('Welcome back')).toBeVisible()

  await page.getByRole('link', { name: /Student Login/i }).click()
  await page.waitForURL('**/student-login')
  await expect(page.getByText('Student sign in')).toBeVisible()
})

test('the sidebar collapses to icon-only, and the choice survives a real refresh', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(SA_EMAIL)
  await page.getByLabel('Password').fill(SA_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')

  const sidebar = page.getByRole('complementary')
  await expect(sidebar.getByText('Students')).toBeVisible()

  await sidebar.getByRole('button', { name: /collapse sidebar/i }).click()
  await expect(sidebar.getByText('Students')).not.toBeVisible()

  await page.reload()

  const sidebarAfterReload = page.getByRole('complementary')
  await expect(sidebarAfterReload.getByRole('button', { name: /expand sidebar/i })).toBeVisible()
  await expect(sidebarAfterReload.getByText('Students')).not.toBeVisible()

  await sidebarAfterReload.getByRole('button', { name: /expand sidebar/i }).click()
  await expect(sidebarAfterReload.getByText('Students')).toBeVisible()
})

test('the sidebar\'s "Roles" link navigates to the real roles list (direct user bug report — was unreachable from any UI element)', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(SA_EMAIL)
  await page.getByLabel('Password').fill(SA_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')

  await page.getByRole('complementary').getByRole('link', { name: /roles/i }).click()

  await page.waitForURL('**/school-admin/roles')
  await expect(page.getByRole('heading', { name: 'Roles & permissions' })).toBeVisible()
})
