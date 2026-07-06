// FR-037 visual-regression (Step 17 / _visual-check.md).
//
// Real end-to-end run: creates a genuine APPROVED link (real parent
// request + real School Admin approval), then a real Parent browses
// the linked child's real menu, builds a real cart for that child,
// checks out choosing between the parent's own wallet (default,
// seeded at $30.00) and the child's own wallet (seeded at $100.00 by
// FR-036's own fixture addition), pays for real, and lands on the
// shared receipt screen's own Parent-shell variant.

import { test, expect } from '@playwright/test'

test('sc-075/077 a real parent checks out for a linked child, choosing their own wallet', async ({
  page,
}) => {
  const studentId = process.env.FR037_STUDENT_ID ?? 'S-B30001'

  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR037_PARENT_EMAIL ?? 'batch3-parent@example.com')
  await page.getByLabel('Password').fill(process.env.FR037_PARENT_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/parent')
  await page.getByRole('link', { name: /add child/i }).click()
  await page.waitForURL('**/parent/children/add')
  await page.getByPlaceholder(/e\.g\. S-40231/i).fill(studentId)
  await page.getByRole('button', { name: /send link request/i }).click()
  await page.waitForLoadState('networkidle')

  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR037_SA_EMAIL ?? 'batch3-sa@example.com')
  await page.getByLabel('Password').fill(process.env.FR037_SA_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')
  await page.evaluate(() => {
    window.history.pushState({}, '', '/school-admin/approvals')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/school-admin/approvals')
  await page.waitForLoadState('networkidle')
  const targetRow = page.locator('div', { hasText: 'Batch3 Student' }).filter({
    has: page.getByRole('button', { name: /^approve$/i }),
  })
  await targetRow.getByRole('button', { name: /^approve$/i }).first().click()
  await page.waitForLoadState('networkidle')

  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR037_PARENT_EMAIL ?? 'batch3-parent@example.com')
  await page.getByLabel('Password').fill(process.env.FR037_PARENT_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/parent')

  await page.getByRole('link', { name: /choose a child/i }).first().click()
  await page.waitForFunction(() => window.location.pathname === '/parent/menu')
  await page.waitForLoadState('networkidle')
  // The real child's UUID (not the human-readable Student ID code used
  // to request the link) — resolved by the app itself into the
  // `?childId=` query param, needed later to navigate back to the
  // child's own cart directly.
  const childId = new URL(page.url()).searchParams.get('childId')

  // Add a real, no-variant product to the real child's real cart.
  const appleCard = page.locator('[data-testid^="menu-item-"]', { hasText: 'Apple Slices' })
  await appleCard.getByRole('button', { name: /^add$/i }).click()
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: /cart ·/i }).click()
  await page.waitForFunction(() => window.location.pathname === '/parent/cart')
  await expect(page.getByText('Apple Slices')).toBeVisible()

  await page.getByRole('button', { name: /^checkout ·/i }).click()
  await page.waitForFunction(() => window.location.pathname === '/parent/checkout')
  await page.waitForLoadState('networkidle')

  // Defaults to the parent's own wallet ($30.00, seeded) — comfortably
  // covers the $1.50 order, so Pay (not a top-up prompt) is shown.
  const parentWalletRadio = page.getByRole('radio', { name: /your wallet/i })
  await expect(parentWalletRadio).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('Balance $30.00')).toBeVisible()
  const payButton = page.getByRole('button', { name: /pay from your wallet · \$1\.50/i })
  await expect(payButton).toBeVisible()
  await payButton.click()

  await page.waitForFunction(() => window.location.pathname === '/parent/checkout/receipt')
  await expect(page.getByText('Order confirmed')).toBeVisible()
  await expect(page.getByText(/^ORD-/)).toBeVisible()
  await expect(page.getByText('Paid from wallet')).toBeVisible()
  await expect(page.getByText('Back to menu')).toBeVisible()

  // The real child's cart is genuinely empty afterward.
  await page.evaluate((sid) => {
    window.history.pushState({}, '', `/parent/cart?childId=${sid}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, childId)
  await expect(page.getByText('This cart is empty')).toBeVisible()
})
