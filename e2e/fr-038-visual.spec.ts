// FR-038 visual-regression (Step 17 / _visual-check.md).
//
// Real end-to-end run: a real Student places a real order (reusing
// FR-036's own checkout flow), then a real School Admin advances that
// SAME real order all the way through the forward-only fulfilment
// sequence (Pending → Confirmed → Preparing → Ready → Completed) via
// the real Kanban board and the real order detail screen, confirming
// each real atomic status transition and that a Completed order
// leaves the active queue and becomes read-only.

import { test, expect } from '@playwright/test'

test('sc-078/079 a real school admin advances a real order through the full fulfilment sequence', async ({
  page,
}) => {
  // Place a real order as Student first.
  await page.goto('/student-login')
  await page.getByLabel('Student ID').fill(process.env.FR038_STUDENT_ID ?? 'S-B30001')
  await page.getByLabel('Password').fill(process.env.FR038_STUDENT_PASSWORD ?? 'StudentVC123!')
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

  // Now advance it as a real School Admin.
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR038_SA_EMAIL ?? 'batch3-sa@example.com')
  await page.getByLabel('Password').fill(process.env.FR038_SA_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')
  await page.evaluate(() => {
    window.history.pushState({}, '', '/school-admin/orders')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/school-admin/orders')
  await page.waitForLoadState('networkidle')

  const card = page.locator('div', { hasText: `#${orderCode}` }).filter({
    has: page.getByRole('button', { name: /^confirm$/i }),
  })
  await expect(card.first()).toBeVisible()
  await card.first().getByRole('button', { name: /^confirm$/i }).click()
  await page.waitForLoadState('networkidle')

  // Now in the Confirmed column — open the detail screen and advance
  // the rest of the way there, proving both entry points work.
  const confirmedCard = page.locator('div', { hasText: `#${orderCode}` }).filter({
    has: page.getByRole('button', { name: /start preparing/i }),
  })
  await confirmedCard.first().getByRole('button', { name: /^open order/i }).click()
  await page.waitForFunction(() => window.location.pathname.includes('/school-admin/orders/'))
  await page.waitForLoadState('networkidle')

  await expect(page.getByText(`Order #ORD-${orderCode}`)).toBeVisible()
  await page.getByRole('button', { name: /start preparing/i }).click()
  await expect(page.getByText('Preparing', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: /mark ready to collect/i }).click()
  await expect(page.getByText('Ready', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: /complete order/i }).click()
  await expect(page.getByText('Completed', { exact: true })).toBeVisible()
  await expect(
    page.getByText('This order has reached a final status and can no longer be changed.'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: /complete order/i })).toHaveCount(0)

  // A completed order leaves the active queue entirely.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/school-admin/orders')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/school-admin/orders')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(`#${orderCode}`)).toHaveCount(0)
})
