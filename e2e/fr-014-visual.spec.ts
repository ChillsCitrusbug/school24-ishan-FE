// FR-014 visual-regression (Step 17 / _visual-check.md).
//
// Sanity screenshots, not asserted against a design baseline — same
// precedent as every prior ticket. Performs a REAL deactivate+
// reactivate round trip on a seeded student, asserting on the actual
// resulting Status pill state after each step (not just a screenshot).

import { test, expect, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function loginAndNavigateTo(page: Page, path: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR014_SA_EMAIL ?? '')
  await page.getByLabel('Password').fill(process.env.FR014_SA_PASSWORD ?? '')
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

test('sc-028/sc-032 students list + status confirm, then a real deactivate+reactivate round trip', async ({
  page,
}) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(page, '/school-admin/students')
  await page.getByRole('heading', { name: 'Students' }).waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-014-visual.spec.ts-snapshots/sc-028-students-list-sanity.png',
    fullPage: true,
  })

  await page.getByRole('button', { name: 'Open Noah Student' }).click()
  await page.getByRole('heading', { name: 'Noah Student' }).waitFor()
  await prep(page)
  await expect(page.getByText('Active').first()).toBeVisible()

  await page.getByRole('button', { name: /^deactivate$/i }).click()
  await page.getByRole('heading', { name: 'Deactivate Noah Student?' }).waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-014-visual.spec.ts-snapshots/sc-032-deactivate-confirm-sanity.png',
    fullPage: true,
  })

  await page.getByRole('button', { name: /deactivate & email/i }).click()
  await page.getByRole('heading', { name: 'Noah Student' }).waitFor()
  await prep(page)
  await expect(page.getByText('Inactive').first()).toBeVisible()

  // Round trip: reactivate back to the original state.
  await page.getByRole('button', { name: /^reactivate$/i }).click()
  await page.getByRole('heading', { name: 'Reactivate Noah Student?' }).waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-014-visual.spec.ts-snapshots/sc-032-reactivate-confirm-sanity.png',
    fullPage: true,
  })

  await page.getByRole('button', { name: /reactivate & email/i }).click()
  await page.getByRole('heading', { name: 'Noah Student' }).waitFor()
  await prep(page)
  await expect(page.getByText('Active').first()).toBeVisible()
})
