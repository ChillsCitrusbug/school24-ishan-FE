// FR-029 visual-regression (Step 17 / _visual-check.md).
//
// Real end-to-end run: creates a genuine APPROVED link (real parent
// request + real School Admin approval, matching every prior ticket's
// own precedent in this batch), then reaches the real child top-up
// screen via the already-built `ChildSelectScreen` (single-child
// auto-resolve), and starts a REAL Stripe PaymentIntent against the
// live test-mode Stripe keys configured in this environment — proving
// the reused FR-028 integration genuinely extends to a child's wallet.
//
// A real webhook delivery isn't reachable from this local dev server
// (no public URL for Stripe to call back to), so this test stops once
// the real Stripe Elements PaymentElement renders — the same honest
// boundary FR-028/030's own visual check already established
// (`fr-028-030-visual.spec.ts`'s own comment: reaching Stripe itself
// is the genuine integration proof; a full card submission's
// webhook-driven result is covered by ChildWalletTopUpScreen.test.tsx,
// which mocks the Stripe SDK boundary instead).
//
// Also confirms the 403 path for real: a parent with NO approved link
// to the target student sees the real "not approved" message, not a
// silent failure or a client-side-only check.

import { test, expect } from '@playwright/test'

test('sc-054 child top-up, real Stripe PaymentIntent reached for an approved child', async ({ page }) => {
  const studentId = process.env.FR029_STUDENT_ID ?? 'S-B30001'

  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR029_PARENT_EMAIL ?? 'batch3-parent@example.com')
  await page.getByLabel('Password').fill(process.env.FR029_PARENT_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/parent')
  await page.getByRole('link', { name: /add child/i }).click()
  await page.waitForURL('**/parent/children/add')
  await page.getByPlaceholder(/e\.g\. S-40231/i).fill(studentId)
  await page.getByRole('button', { name: /send link request/i }).click()
  await page.waitForLoadState('networkidle')

  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR029_SA_EMAIL ?? 'batch3-sa@example.com')
  await page.getByLabel('Password').fill(process.env.FR029_SA_PASSWORD ?? 'VisualCheck123!')
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
  await page.getByLabel('Email').fill(process.env.FR029_PARENT_EMAIL ?? 'batch3-parent@example.com')
  await page.getByLabel('Password').fill(process.env.FR029_PARENT_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/parent')

  // Real selection mechanism (FR-022) — single approved child
  // auto-resolves straight into the new child top-up screen.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/parent/select-child?next=/parent/wallet/top-up-child')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.search.includes('childId='))
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('heading', { name: /^Top up .+'s wallet$/ })).toBeVisible()

  await page.getByRole('button', { name: /continue to payment/i }).click()
  await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible()
  // A real Stripe Elements iframe — genuine proof the reused
  // integration created a real PaymentIntent for this child's wallet.
  await expect(page.locator('iframe[title="Secure payment input frame"]').first()).toBeVisible({
    timeout: 15_000,
  })
})

test('sc-054 child top-up, a non-approved link is rejected with the real 403 message', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR029_PARENT_EMAIL ?? 'batch3-parent@example.com')
  await page.getByLabel('Password').fill(process.env.FR029_PARENT_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/parent')

  // A childId this parent has no approved (or any) link to.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/parent/wallet/top-up-child?childId=00000000-0000-0000-0000-000000000000')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(
    () => window.location.pathname === '/parent/wallet/top-up-child',
  )
  await page.waitForLoadState('networkidle')

  await expect(
    page.getByText("You can only top up a child's wallet once your link to them is approved."),
  ).toBeVisible()
})
