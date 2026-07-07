// FR-036 visual-regression (Step 17 / _visual-check.md).
//
// Real end-to-end run: a real Student logs in, adds a real menu item
// to their real cart, goes to checkout, sees their real wallet balance
// ($100.00, seeded), pays for real (a real atomic wallet debit + a
// real order/order_item insert), and lands on the real receipt screen
// with the real Order ID, items, and total.

import { test, expect } from '@playwright/test'

test('sc-074/077 a real student checks out from their own wallet and gets a real receipt', async ({
  page,
}) => {
  await page.goto('/student-login')
  await page.getByLabel('Student ID').fill(process.env.FR036_STUDENT_ID ?? 'S-B30001')
  await page.getByLabel('Password').fill(process.env.FR036_STUDENT_PASSWORD ?? 'StudentVC123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/student')

  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /^browse menu$/i }).click()
  await page.waitForURL('**/student/menu')
  await page.waitForLoadState('networkidle')

  // Add a real, no-variant product directly (Apple Slices, FR-033's
  // own fixture — never blocked, no variant step).
  const appleCard = page.locator('[data-testid^="menu-item-"]', { hasText: 'Apple Slices' })
  await appleCard.getByRole('button', { name: /^add$/i }).click()
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: /cart ·/i }).click()
  await page.waitForURL('**/student/cart')
  await expect(page.getByText('Apple Slices')).toBeVisible()

  await page.getByRole('button', { name: /^checkout ·/i }).click()
  await page.waitForURL('**/student/checkout')
  await page.waitForLoadState('networkidle')

  // The real seeded wallet balance ($100.00) comfortably covers a
  // real $1.50 order — the Pay button, not "Add funds", is shown.
  await expect(page.getByText('Balance $100.00')).toBeVisible()
  const payButton = page.getByRole('button', { name: /pay & place order · \$1\.50/i })
  await expect(payButton).toBeVisible()
  await payButton.click()

  await page.waitForURL('**/student/checkout/receipt')
  await expect(page.getByText('Order confirmed')).toBeVisible()
  await expect(page.getByText(/^ORD-/)).toBeVisible()
  await expect(page.getByText('Pending — show at counter')).toBeVisible()
  await expect(page.getByText('Apple Slices')).toBeVisible()

  // The real cart is genuinely empty afterward — re-visiting it shows
  // the real empty state, not a stale leftover line. Client-side
  // navigation (not page.goto/a real reload) — this app's JWT is
  // in-memory only, and a real reload would silently wipe it.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/student/cart')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(page.getByText('Your cart is empty')).toBeVisible()
})
