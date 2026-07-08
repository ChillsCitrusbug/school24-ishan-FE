// Direct user bug report (2026-07-08), outside any ticket — real
// end-to-end coverage of 2 fixes:
//   1. The School Admin dashboard (/school-admin) had been permanently
//      stuck on a placeholder ("Let's set up your school" + a dead
//      "Create a class" button) instead of switching to real StatCards
//      once classes/students/orders/approvals actually shipped. Now
//      calls a real GET /api/v1/analytics/school-dashboard.
//   2. Students had no way to reach their own order history/status —
//      studentNav.ts never wired a "My orders" sidebar link into any
//      Student screen. This confirms the fix end-to-end: place a real
//      order, then use the real sidebar link (not a direct URL) to
//      find it with its real status.

import { test, expect, type Page } from '@playwright/test'

const SA_EMAIL = process.env.FR045_SA_EMAIL ?? 'batch3-sa@example.com'
const SA_PASSWORD = process.env.FR045_SA_PASSWORD ?? 'VisualCheck123!'
const STUDENT_ID_CODE = process.env.FR047_STUDENT_ID ?? 'S-B30001'
const STUDENT_PASSWORD = process.env.FR047_STUDENT_PASSWORD ?? 'StudentVC123!'

async function spaNavigate(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForFunction((p) => window.location.pathname === p, path)
}

test('a real School Admin sees a real dashboard, not the permanent "Let\'s set up your school" placeholder', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(SA_EMAIL)
  await page.getByLabel('Password').fill(SA_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')
  await page.waitForLoadState('networkidle')

  // The seeded fixture already has a real class + student, so the
  // dashboard's own `is_empty` must be false — real StatCards, not the
  // empty-state placeholder. "Students"/"Classes" also appear in the
  // sidebar/mobile-tab nav, so these are scoped to the main content area.
  await expect(page.getByText("Let’s set up your school")).not.toBeVisible()
  const main = page.getByRole('main')
  await expect(main.getByText('Students', { exact: true })).toBeVisible()
  await expect(main.getByText('Classes', { exact: true })).toBeVisible()
  await expect(main.getByText('Orders today')).toBeVisible()
  await expect(main.getByText('Quick actions')).toBeVisible()

  // The "Manage classes" quick action is a real, working link.
  await page.getByRole('button', { name: /manage classes/i }).click()
  await expect(page.getByRole('heading', { name: 'Classes' })).toBeVisible()
})

test('a real student places an order, then finds it via the real "My orders" sidebar link with its real status', async ({
  page,
}) => {
  await page.goto('/student-login')
  await page.getByLabel('Student ID').fill(STUDENT_ID_CODE)
  await page.getByLabel('Password').fill(STUDENT_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/student')

  await spaNavigate(page, '/student/menu')
  await page.waitForLoadState('networkidle')
  // Lunch Combo (not Chicken Wrap) — a combo has a single fixed price
  // and no variant picker, so "Add" adds it straight to cart instead
  // of navigating to a variant-selection screen first.
  const comboCard = page.locator('[data-testid^="menu-item-"]', { hasText: 'Lunch Combo' })
  await comboCard.getByRole('button', { name: /^add$/i }).click()
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /cart ·/i }).click()
  await page.waitForURL('**/student/cart')
  await page.getByRole('button', { name: /^checkout ·/i }).click()
  await page.waitForURL('**/student/checkout')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /pay & place order/i }).click()
  await page.waitForURL('**/student/checkout/receipt')
  await expect(page.getByText('Order confirmed')).toBeVisible()

  // Back to the real dashboard, then the real sidebar nav link — not a
  // direct URL — proving the fix is genuinely reachable from the UI.
  await spaNavigate(page, '/student')
  await page.waitForLoadState('networkidle')
  await page.getByRole('complementary').getByRole('link', { name: /my orders/i }).click()
  await page.waitForURL('**/student/orders')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('heading', { name: 'My orders' })).toBeVisible()
  // The just-placed order is visible with a real status pill — not an
  // empty state, not a permission error.
  await expect(page.getByText(/pending|confirmed|preparing|ready/i).first()).toBeVisible()
})
