// FR-051 visual-regression (Step 17 / _visual-check.md).
//
// Sanity screenshots, not asserted against a design baseline — same
// precedent as every prior ticket. Performs a REAL credential reset on
// a seeded, currently-active student, then a REAL student login with
// the newly-issued temp password to prove it actually works and that
// the forced first-login gate (`change_token`, not `access_token`) is
// genuinely re-triggered — not just that the SA-facing screen renders.

import { test, expect, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function loginAndNavigateTo(page: Page, path: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR051_SA_EMAIL ?? '')
  await page.getByLabel('Password').fill(process.env.FR051_SA_PASSWORD ?? '')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')

  await page.evaluate((target) => {
    window.history.pushState({}, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForFunction((target) => window.location.pathname === target, path)
}

async function prep(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}

test('sc-099 reset-credential confirm + success, then a real student login proves the new password works', async ({
  page,
}) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')

  const studentId = process.env.FR051_STUDENT_ID ?? ''
  const studentName = process.env.FR051_STUDENT_NAME ?? ''

  await loginAndNavigateTo(page, '/school-admin/students')
  await page.getByRole('button', { name: `Open ${studentName}` }).click()
  await page.getByRole('heading', { name: studentName }).waitFor()
  await prep(page)

  await page.getByRole('button', { name: /reset credential/i }).click()
  await page.getByRole('heading', { name: `Reset ${studentName}’s password?` }).waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-051-visual.spec.ts-snapshots/sc-099-reset-confirm-sanity.png',
    fullPage: true,
  })

  await page.getByRole('button', { name: /^reset password$/i }).click()
  await page.getByRole('heading', { name: 'Password reset' }).waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-051-visual.spec.ts-snapshots/sc-099-reset-success-sanity.png',
    fullPage: true,
  })

  const newTempPassword = await page
    .locator('.font-mono.text-lg.font-bold.text-ink')
    .innerText()

  // Real proof this actually works: log the student in with the newly
  // issued password and confirm the forced first-login gate fires
  // (change_token in the response, per FR-002), not a full session.
  const loginResponse = await page.request.post('/api/v1/student-auth/login', {
    data: { student_id: studentId, password: newTempPassword },
  })
  expect(loginResponse.ok()).toBe(true)
  const loginBody = await loginResponse.json()
  expect(loginBody.data.change_token).toBeTruthy()
  expect(loginBody.data.access_token).toBeUndefined()
})
