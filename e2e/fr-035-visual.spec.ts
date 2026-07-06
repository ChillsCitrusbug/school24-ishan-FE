// FR-035 visual-regression (Step 17 / _visual-check.md).
//
// Real end-to-end run: a real Student browses their own school's real
// menu (reuses the shared batch3 fixture's own "Chicken Wrap" product
// with 2 real variants, plus the real "Lunch Combo" bundling it),
// selects a required size, adds it to a real cart, adds a real combo
// directly (no variant concept), and views the real cart with its own
// resolved prices and total.

import { test, expect } from '@playwright/test'

test('sc-071/072/073 a real student browses the menu, selects a size, and builds a real cart', async ({ page }) => {
  await page.goto('/student-login')
  await page.getByLabel('Student ID').fill(process.env.FR035_STUDENT_ID ?? 'S-B30001')
  await page.getByLabel('Password').fill(process.env.FR035_STUDENT_PASSWORD ?? 'StudentVC123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/student')

  await page.getByRole('link', { name: /browse menu/i }).click()
  await page.waitForURL('**/student/menu')
  await page.waitForLoadState('networkidle')

  // Real category filter — "Hot Food" shows only its own real product,
  // never the shared fixture's "Soft Drinks" items or the combo (no
  // category concept for combos in this real schema).
  await page.getByRole('button', { name: /^hot food$/i }).click()
  await expect(page.getByText('Chicken Wrap')).toBeVisible()
  await expect(page.getByText('Chocolate Brownie')).toHaveCount(0)
  await expect(page.getByText('Lunch Combo')).toHaveCount(0)

  // A product WITH variants navigates to its own detail screen on Add
  // — it cannot be added straight from the grid.
  await page.getByRole('button', { name: /^add$/i }).click()
  await page.waitForURL('**/student/menu/products/*')
  await expect(page.getByText('Choose a size', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /add to cart/i })).toBeDisabled()

  await page.getByRole('radio', { name: /large/i }).click()
  await expect(page.getByRole('button', { name: /add to cart/i })).toBeEnabled()
  await expect(page.getByRole('radio', { name: /large · \$8\.00/i })).toBeVisible()
  await page.getByRole('button', { name: /add to cart/i }).click()
  await page.waitForURL('**/student/cart')

  // The real cart shows the real variant-priced line — $8.00 (Large),
  // never the product's own $6.50 base price.
  const wrapLine = page
    .locator('div', { hasText: 'Chicken Wrap' })
    .filter({ has: page.getByText('Large') })
    .first()
  await expect(wrapLine.getByText('$8.00').first()).toBeVisible()
  await expect(page.getByText('$6.50')).toHaveCount(0)

  // Back to the menu, add the real combo directly (no variant step).
  await page.getByRole('button', { name: /^menu$/i }).click()
  await page.waitForURL('**/student/menu')
  await page.waitForLoadState('networkidle')
  // Scoped by the real MenuCard's own `data-testid` (one per real menu
  // item id) — a plain text-based div locator is ambiguous here, since
  // the whole grid's own container div also "contains" every card's
  // text and every card's own Add button.
  const comboCard = page.locator('[data-testid^="menu-item-"]', { hasText: 'Lunch Combo' })
  await comboCard.getByRole('button', { name: /^add$/i }).click()
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: /cart ·/i }).click()
  await page.waitForURL('**/student/cart')
  await expect(page.getByText('Lunch Combo')).toBeVisible()

  // Real total = 8.00 (Chicken Wrap, Large) + 8.50 (Lunch Combo) = 16.50
  // — read off the (single, unique) Checkout button's own real total.
  await expect(page.getByRole('button', { name: /checkout · \$16\.50/i })).toBeVisible()
})
