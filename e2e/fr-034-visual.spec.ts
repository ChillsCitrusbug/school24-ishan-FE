// FR-034 visual-regression (Step 17 / _visual-check.md).
//
// Real end-to-end run: creates a genuine APPROVED link (real parent
// request + real School Admin approval), reaches the real
// food-restrictions screen, blocks a real product and a real category,
// then removes each restriction for real via the destructive-confirm
// Dialog, confirming the item disappears from the blocked lists and
// the screen falls back to its own empty state once nothing is left
// blocked.

import { test, expect } from '@playwright/test'

test('sc-067 removing a food restriction unblocks the item, live, no automatic expiry needed', async ({
  page,
}) => {
  const studentId = process.env.FR034_STUDENT_ID ?? 'S-B30001'

  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR034_PARENT_EMAIL ?? 'batch3-parent@example.com')
  await page.getByLabel('Password').fill(process.env.FR034_PARENT_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/parent')
  await page.getByRole('link', { name: /add child/i }).click()
  await page.waitForURL('**/parent/children/add')
  await page.getByPlaceholder(/e\.g\. S-40231/i).fill(studentId)
  await page.getByRole('button', { name: /send link request/i }).click()
  await page.waitForLoadState('networkidle')

  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR034_SA_EMAIL ?? 'batch3-sa@example.com')
  await page.getByLabel('Password').fill(process.env.FR034_SA_PASSWORD ?? 'VisualCheck123!')
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
  await page.getByLabel('Email').fill(process.env.FR034_PARENT_EMAIL ?? 'batch3-parent@example.com')
  await page.getByLabel('Password').fill(process.env.FR034_PARENT_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/parent')

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

  // Block a real category.
  await page.getByLabel('Search items to block').fill('soft')
  await page.getByRole('button', { name: /^search$/i }).click()
  await expect(page.getByText('Soft Drinks')).toBeVisible()
  await page.getByRole('button', { name: /^add$/i }).click()
  await expect(page.getByText('Blocked categories')).toBeVisible()

  // Remove the real product restriction — destructive-confirm Dialog,
  // per the ticket's own DoD, then a genuine DELETE against the API.
  await page.getByLabel('Unblock Chocolate Brownie').click()
  await expect(page.getByText('Unblock "Chocolate Brownie"?')).toBeVisible()
  await page.getByRole('button', { name: /^unblock$/i }).click()
  await expect(page.getByText('Blocked products')).toHaveCount(0)
  await expect(page.getByText('Chocolate Brownie')).toHaveCount(0)

  // The category restriction is still real and still blocking —
  // removing the product must not have touched it.
  await expect(page.getByText('Soft Drinks')).toBeVisible()

  // Remove the real category restriction too — nothing left blocked,
  // the screen falls back to its own real empty state (EC-016: no
  // automatic expiry anywhere else — removal is the only path here).
  await page.getByLabel('Unblock Soft Drinks').click()
  await expect(page.getByText('Unblock "Soft Drinks"?')).toBeVisible()
  await page.getByRole('button', { name: /^unblock$/i }).click()
  await expect(page.getByText('No restrictions set')).toBeVisible()

  // The removed product is genuinely orderable again — re-adding it
  // as a fresh restriction succeeds (a still-blocked item would 409,
  // per Scenario 3 already proven in FR-032's own spec).
  await page.getByLabel('Search items to block').fill('choc')
  await page.getByRole('button', { name: /^search$/i }).click()
  await page.getByRole('button', { name: /^add$/i }).click()
  await expect(page.getByText('Blocked products')).toBeVisible()
  await expect(page.getByText('This item or category is already blocked for this child.')).toHaveCount(0)
})
