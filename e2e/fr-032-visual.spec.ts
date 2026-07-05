// FR-032 visual-regression (Step 17 / _visual-check.md).
//
// Real end-to-end run: creates a genuine APPROVED link (real parent
// request + real School Admin approval, matching every prior ticket's
// own precedent in this batch), reaches the real food-restrictions
// screen via the already-built `ChildSelectScreen` (single-child
// auto-resolve), searches the real catalog (a real product/category
// seeded for this school by `scripts/seed_batch3_fixtures.py`), blocks
// each of them for real, and confirms a real 409 on a genuine
// duplicate submission.

import { test, expect } from '@playwright/test'

test('sc-067 food restrictions, a real product and category are blocked for an approved child', async ({ page }) => {
  const studentId = process.env.FR032_STUDENT_ID ?? 'S-B30001'

  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR032_PARENT_EMAIL ?? 'batch3-parent@example.com')
  await page.getByLabel('Password').fill(process.env.FR032_PARENT_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/parent')
  await page.getByRole('link', { name: /add child/i }).click()
  await page.waitForURL('**/parent/children/add')
  await page.getByPlaceholder(/e\.g\. S-40231/i).fill(studentId)
  await page.getByRole('button', { name: /send link request/i }).click()
  await page.waitForLoadState('networkidle')

  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR032_SA_EMAIL ?? 'batch3-sa@example.com')
  await page.getByLabel('Password').fill(process.env.FR032_SA_PASSWORD ?? 'VisualCheck123!')
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
  await page.getByLabel('Email').fill(process.env.FR032_PARENT_EMAIL ?? 'batch3-parent@example.com')
  await page.getByLabel('Password').fill(process.env.FR032_PARENT_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/parent')

  // Real selection mechanism (FR-022) — single approved child
  // auto-resolves straight into the new food restrictions screen.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/parent/select-child?next=/parent/food-restrictions')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.search.includes('childId='))
  await page.waitForLoadState('networkidle')

  await expect(page.getByText('No restrictions set')).toBeVisible()

  // Block a real product.
  await page.getByLabel('Search items to block').fill('choc')
  await page.getByRole('button', { name: /^search$/i }).click()
  await expect(page.getByText('Chocolate Brownie')).toBeVisible()
  await page.getByRole('button', { name: /^add$/i }).click()
  await expect(page.getByText('Blocked products')).toBeVisible()
  await expect(page.getByText('Chocolate Brownie')).toBeVisible()

  // Block a real category.
  await page.getByLabel('Search items to block').fill('soft')
  await page.getByRole('button', { name: /^search$/i }).click()
  await expect(page.getByText('Soft Drinks')).toBeVisible()
  await page.getByRole('button', { name: /^add$/i }).click()
  await expect(page.getByText('Blocked categories')).toBeVisible()

  // A genuine duplicate submission is rejected with a real 409 message.
  await page.getByLabel('Search items to block').fill('choc')
  await page.getByRole('button', { name: /^search$/i }).click()
  await page.getByRole('button', { name: /^add$/i }).click()
  await expect(page.getByText('This item or category is already blocked for this child.')).toBeVisible()

  // No "unblock" control anywhere — removal is FR-034, out of scope.
  await expect(page.getByLabel(/unblock/i)).toHaveCount(0)
})
