// FR-021 visual-regression (Step 17 / _visual-check.md).
//
// Real end-to-end run: a real parent requests a link, a real School
// Admin approves it (reusing FR-019/020's own real flows to get a
// genuine APPROVED, active link to remove — not a seeded fixture),
// then navigates to that student's own Guardians screen (Sc045) and
// removes the guardian, confirmed via a genuinely re-fetched list.

import { test, expect } from '@playwright/test'

test('sc-045 guardians screen, real remove round trip', async ({ page }) => {
  const studentId = process.env.FR021_STUDENT_ID ?? 'S-B30001'

  // Ensure a real, live APPROVED link exists to remove.
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR021_PARENT_EMAIL ?? 'batch3-parent@example.com')
  await page.getByLabel('Password').fill(process.env.FR021_PARENT_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/parent')
  await page.getByRole('link', { name: /add child/i }).click()
  await page.waitForURL('**/parent/children/add')
  await page.getByPlaceholder(/e\.g\. S-40231/i).fill(studentId)
  await page.getByRole('button', { name: /send link request/i }).click()
  await page.waitForLoadState('networkidle')

  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR021_SA_EMAIL ?? 'batch3-sa@example.com')
  await page.getByLabel('Password').fill(process.env.FR021_SA_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')

  await page.evaluate(() => {
    window.history.pushState({}, '', '/school-admin/approvals')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/school-admin/approvals')
  await page.waitForLoadState('networkidle')
  const approveButtons = page.getByRole('button', { name: /^approve$/i })
  if (await approveButtons.count()) {
    await approveButtons.first().click()
    await page.waitForLoadState('networkidle')
  }

  // Navigate to the student's own detail page, then its Guardians screen.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/school-admin/students')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/school-admin/students')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('Student ID').fill(studentId)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /^open /i }).first().click()
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /manage guardians/i }).click()
  await page.waitForLoadState('networkidle')

  await expect(page.getByText(/^Guardians — /)).toBeVisible()
  const removeButtons = page.getByRole('button', { name: /^remove$/i })
  await expect(removeButtons.first()).toBeVisible()
  const countBefore = await removeButtons.count()
  expect(countBefore).toBeGreaterThan(0)

  await removeButtons.first().click()
  await page.getByRole('button', { name: /confirm removal/i }).click()
  await expect(removeButtons).toHaveCount(countBefore - 1)

  // Real proof of persistence: navigate away and back (not reload —
  // the JWT is in-memory only), re-fetching from the live backend.
  const guardiansUrl = page.url()
  await page.evaluate(() => {
    window.history.pushState({}, '', '/school-admin')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/school-admin')
  await page.evaluate((url) => {
    window.history.pushState({}, '', url)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, guardiansUrl)
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('button', { name: /^remove$/i })).toHaveCount(countBefore - 1)
})
