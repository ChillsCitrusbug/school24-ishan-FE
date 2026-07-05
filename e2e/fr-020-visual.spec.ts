// FR-020 visual-regression (Step 17 / _visual-check.md).
//
// Real end-to-end run against the live local stack: a real parent
// requests a link to the batch's own seeded student (FR-019's own
// endpoint), then a real School Admin sees it in the Approval Queue
// and approves it — confirmed by the request disappearing from the
// live-refetched queue, not just an optimistic client-side removal.

import { test, expect } from '@playwright/test'

test('sc-043/sc-044 approval queue, real approve round trip', async ({ page }) => {
  const studentId = process.env.FR020_STUDENT_ID ?? 'S-B30001'

  // Submit a real link request as the parent first. If a live request
  // already exists from a prior run, this submission itself may 409
  // (ALREADY_LINKED_OR_PENDING) — that's fine, it just means there's
  // already a real pending row to review below.
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR020_PARENT_EMAIL ?? 'batch3-parent@example.com')
  await page.getByLabel('Password').fill(process.env.FR020_PARENT_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/parent')
  await page.getByRole('link', { name: /add child/i }).click()
  await page.waitForURL('**/parent/children/add')
  await page.getByPlaceholder(/e\.g\. S-40231/i).fill(studentId)
  await page.getByRole('button', { name: /send link request/i }).click()
  await page.waitForLoadState('networkidle')

  // Fresh identity: a real full navigation to /login is fine here (we
  // deliberately want to drop the parent's session, not preserve it).
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR020_SA_EMAIL ?? 'batch3-sa@example.com')
  await page.getByLabel('Password').fill(process.env.FR020_SA_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')

  await page.evaluate(() => {
    window.history.pushState({}, '', '/school-admin/approvals')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/school-admin/approvals')
  await page.waitForLoadState('networkidle')

  await expect(page.getByText('Link approvals')).toBeVisible()
  const approveButtons = page.getByRole('button', { name: /^approve$/i })
  await expect(approveButtons.first()).toBeVisible()
  const countBefore = await approveButtons.count()
  expect(countBefore).toBeGreaterThan(0)

  await approveButtons.first().click()
  await expect(approveButtons).toHaveCount(countBefore - 1)

  // Real proof of persistence: navigate away and back, re-fetching from
  // the live backend (not page.reload() — this app's JWT is in-memory
  // only, same class of issue FR-012's own visual check first found).
  await page.evaluate(() => {
    window.history.pushState({}, '', '/school-admin')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/school-admin')
  await page.evaluate(() => {
    window.history.pushState({}, '', '/school-admin/approvals')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/school-admin/approvals')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('button', { name: /^approve$/i })).toHaveCount(countBefore - 1)
})
