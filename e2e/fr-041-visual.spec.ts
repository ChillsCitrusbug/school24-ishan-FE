// FR-041 visual-regression (Step 17 / _visual-check.md).
//
// Real end-to-end run, proving the actual WebSocket transport works,
// not just the mocked unit tests: a real Student places a real order
// (reusing FR-036's own checkout flow) and opens the real tracking
// screen for it, leaving that page open. A SEPARATE real School Admin
// session (its own browser context) then confirms that SAME order via
// the real fulfilment board. The Student's own already-open tracking
// page — never reloaded, never re-navigated — is asserted to update
// live (the timeline's own current step moving from "Order placed" to
// "Confirmed"), proving the `/api/v1/ws/orders` broadcast genuinely
// reached a real connected browser tab and triggered a real refetch.
//
// A second check confirms the Order History list itself
// (`?view=active`/`?view=history`) correctly separates active from
// completed orders once the SA later completes the same order.

import { test, expect } from '@playwright/test'

const STUDENT_ID_CODE = process.env.FR041_STUDENT_ID ?? 'S-B30001'
const STUDENT_PASSWORD = process.env.FR041_STUDENT_PASSWORD ?? 'StudentVC123!'
const SA_EMAIL = process.env.FR041_SA_EMAIL ?? 'batch3-sa@example.com'
const SA_PASSWORD = process.env.FR041_SA_PASSWORD ?? 'VisualCheck123!'

test('fr-041 a students own open tracking screen updates live via websocket when staff advances the order', async ({
  page,
  browser,
}) => {
  // Place a real order as Student, in the main `page`.
  await page.goto('/student-login')
  await page.getByLabel('Student ID').fill(STUDENT_ID_CODE)
  await page.getByLabel('Password').fill(STUDENT_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/student')
  await page.getByRole('link', { name: /browse menu/i }).click()
  await page.waitForURL('**/student/menu')
  await page.waitForLoadState('networkidle')
  const appleCard = page.locator('[data-testid^="menu-item-"]', { hasText: 'Apple Slices' })
  await appleCard.getByRole('button', { name: /^add$/i }).click()
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /cart ·/i }).click()
  await page.waitForURL('**/student/cart')
  await page.getByRole('button', { name: /^checkout ·/i }).click()
  await page.waitForURL('**/student/checkout')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /pay & place order/i }).click()
  await page.waitForURL('**/student/checkout/receipt')
  const orderIdText = await page.getByText(/^ORD-/).innerText()
  const orderCode = orderIdText.replace(/^ORD-/, '')

  // Open the real Order History list, then the real tracking screen for
  // this specific order, and leave it open — this is the page that
  // must update live, with no reload and no re-navigation from here on.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/student/orders')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/student/orders')
  await page.waitForLoadState('networkidle')
  await page.getByText(`#ORD-${orderCode}`).click()
  await page.waitForFunction(() => window.location.pathname.includes('/student/orders/'))
  await expect(page.getByText(`Order #ORD-${orderCode}`)).toBeVisible()

  const orderPlacedStep = page.locator('li', { hasText: 'Order placed' })
  const confirmedStep = page.locator('li', { hasText: 'Confirmed' })
  await expect(orderPlacedStep.getByText('In progress')).toBeVisible()
  await expect(confirmedStep.getByText('In progress')).toHaveCount(0)

  // A completely separate real School Admin session, its own browser
  // context — the Student's own `page` above is never touched again
  // until the final assertion.
  const saContext = await browser.newContext()
  const saPage = await saContext.newPage()
  await saPage.goto('/login')
  await saPage.getByLabel('Email').fill(SA_EMAIL)
  await saPage.getByLabel('Password').fill(SA_PASSWORD)
  await saPage.getByRole('button', { name: /sign in/i }).click()
  await saPage.waitForURL('**/school-admin')
  await saPage.evaluate(() => {
    window.history.pushState({}, '', '/school-admin/orders')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await saPage.waitForFunction(() => window.location.pathname === '/school-admin/orders')
  await saPage.waitForLoadState('networkidle')
  const pendingCard = saPage.locator('div', { hasText: `#${orderCode}` }).filter({
    has: saPage.getByRole('button', { name: /^confirm$/i }),
  })
  await pendingCard.first().getByRole('button', { name: /^confirm$/i }).click()
  await saPage.waitForLoadState('networkidle')

  // Back on the Student's own already-open tracking page — no reload,
  // no click, no navigation. The live update must arrive on its own.
  await expect(confirmedStep.getByText('In progress')).toBeVisible({ timeout: 5000 })
  await expect(orderPlacedStep.getByText('In progress')).toHaveCount(0)

  // Now complete the order as SA, and confirm the Student's own
  // history list correctly separates it into the Completed tab.
  const confirmedCard = saPage.locator('div', { hasText: `#${orderCode}` }).filter({
    has: saPage.getByRole('button', { name: /start preparing/i }),
  })
  await confirmedCard.first().getByRole('button', { name: /^open order/i }).click()
  await saPage.waitForFunction(() => window.location.pathname.includes('/school-admin/orders/'))
  await saPage.waitForLoadState('networkidle')
  await saPage.getByRole('button', { name: /start preparing/i }).click()
  await expect(saPage.getByText('Preparing', { exact: true })).toBeVisible()
  await saPage.getByRole('button', { name: /mark ready to collect/i }).click()
  await expect(saPage.getByText('Ready', { exact: true })).toBeVisible()
  await saPage.getByRole('button', { name: /complete order/i }).click()
  await expect(saPage.getByText('Completed', { exact: true })).toBeVisible()
  await saContext.close()

  await page.evaluate(() => {
    window.history.pushState({}, '', '/student/orders')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/student/orders')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Completed' }).click()
  await expect(page.getByText(`#ORD-${orderCode}`)).toBeVisible()
  await page.getByRole('button', { name: 'Active' }).click()
  await expect(page.getByText(`#ORD-${orderCode}`)).toHaveCount(0)
})
