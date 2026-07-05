// FR-022 visual-regression (Step 17 / _visual-check.md).
//
// Real end-to-end run: creates one genuine APPROVED link (real parent
// request + real School Admin approval, matching FR-019/020's own
// precedent) so the parent has exactly one approved child, then
// confirms the single-child auto-resolve path never renders the
// picker, landing directly on the "next" destination with the
// resolved child's id.

import { test, expect } from '@playwright/test'

test('sc-064 child selection, single child auto-resolves with no picker', async ({ page }) => {
  const studentId = process.env.FR022_STUDENT_ID ?? 'S-B30001'

  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR022_PARENT_EMAIL ?? 'batch3-parent@example.com')
  await page.getByLabel('Password').fill(process.env.FR022_PARENT_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/parent')
  await page.getByRole('link', { name: /add child/i }).click()
  await page.waitForURL('**/parent/children/add')
  await page.getByPlaceholder(/e\.g\. S-40231/i).fill(studentId)
  await page.getByRole('button', { name: /send link request/i }).click()
  await page.waitForLoadState('networkidle')

  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR022_SA_EMAIL ?? 'batch3-sa@example.com')
  await page.getByLabel('Password').fill(process.env.FR022_SA_PASSWORD ?? 'VisualCheck123!')
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

  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR022_PARENT_EMAIL ?? 'batch3-parent@example.com')
  await page.getByLabel('Password').fill(process.env.FR022_PARENT_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/parent')

  await page.getByRole('link', { name: /choose a child/i }).click()
  await page.waitForLoadState('networkidle')

  // Auto-resolved straight through — never shows "Choose a child".
  await expect(page.getByRole('heading', { name: 'Choose a child' })).toHaveCount(0)
  await page.waitForURL('**/parent?childId=*')
  await expect(page.getByText(/ordering context loaded/i)).toBeVisible()
})
