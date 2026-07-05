// FR-023 visual-regression (Step 17 / _visual-check.md).
//
// Real end-to-end run: a real parent request creates a live PENDING
// link, confirmed shown as Pending on "My children" with no order/
// top-up controls. The parent's tab is then left OPEN on that screen
// (no navigation away, no reload) while a SEPARATE browser context
// logs in as the School Admin and approves the request — proving the
// status genuinely flips in place via this screen's own polling, not
// merely on a fresh page load.

import { test, expect } from '@playwright/test'

test('sc-061 my children, pending flips to approved live via polling', async ({ page, context }) => {
  const studentId = process.env.FR023_STUDENT_ID ?? 'S-B30001'

  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR023_PARENT_EMAIL ?? 'batch3-parent@example.com')
  await page.getByLabel('Password').fill(process.env.FR023_PARENT_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/parent')
  await page.getByRole('link', { name: /add child/i }).click()
  await page.waitForURL('**/parent/children/add')
  await page.getByPlaceholder(/e\.g\. S-40231/i).fill(studentId)
  await page.getByRole('button', { name: /send link request/i }).click()
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: /back to my children/i }).click()
  await page.waitForURL('**/parent/children')
  await expect(page.getByText('Pending approval')).toBeVisible()
  await expect(page.getByText('Link request pending school approval')).toBeVisible()
  // Exact match: the per-child ActionTile's own label is literally "Top
  // up" (no "wallet" suffix) — this must stay absent for a pending-only
  // child, distinct from the page's own "Top up wallet" topbar button
  // (the parent's own wallet, unrelated to any specific child's status).
  await expect(page.getByText('Top up', { exact: true })).toHaveCount(0)

  // A genuinely separate browser context/session — the parent's own
  // tab above is never navigated away from or reloaded.
  const saContext = await context.browser()!.newContext()
  const saPage = await saContext.newPage()
  await saPage.goto('/login')
  await saPage.getByLabel('Email').fill(process.env.FR023_SA_EMAIL ?? 'batch3-sa@example.com')
  await saPage.getByLabel('Password').fill(process.env.FR023_SA_PASSWORD ?? 'VisualCheck123!')
  await saPage.getByRole('button', { name: /sign in/i }).click()
  await saPage.waitForURL('**/school-admin')
  await saPage.evaluate(() => {
    window.history.pushState({}, '', '/school-admin/approvals')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await saPage.waitForFunction(() => window.location.pathname === '/school-admin/approvals')
  await saPage.waitForLoadState('networkidle')
  // Round-1 review finding (Minor/Nit): scope to the row for THIS
  // test's own seeded student (`Batch3 Student`, per
  // scripts/seed_batch3_fixtures.py) rather than blindly `.first()`,
  // which could silently approve the wrong request if the shared dev
  // environment ever has more than one pending item at run time.
  const targetRow = saPage.locator('div', { hasText: 'Batch3 Student' }).filter({
    has: saPage.getByRole('button', { name: /^approve$/i }),
  })
  await targetRow.getByRole('button', { name: /^approve$/i }).first().click()
  await saPage.waitForLoadState('networkidle')
  await saContext.close()

  // Back on the PARENT's still-open, never-navigated tab: the next
  // poll tick (screen's own 10s interval) picks up the approval with
  // no reload and no re-navigation at all.
  await expect(page.getByText('Approved')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Pending approval')).toHaveCount(0)
})
