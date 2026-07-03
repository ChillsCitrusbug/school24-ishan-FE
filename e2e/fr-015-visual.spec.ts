// FR-015 visual-regression (Step 17 / _visual-check.md).
//
// Sanity-only screenshots, not asserted against a design baseline — same
// precedent as every prior ticket in this batch. SC-034/035/095's own
// approved layouts are wired for real here (field-reconciliation
// decision #1: Mobile/Position/Department added beyond the mock).
//
//   VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//     FR015_SA_EMAIL=<seeded> FR015_SA_PASSWORD=<seeded> \
//     npx playwright test fr-015-visual

import { test, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function prep(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}

async function loginAndNavigateTo(page: Page, path: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR015_SA_EMAIL ?? '')
  await page.getByLabel('Password').fill(process.env.FR015_SA_PASSWORD ?? '')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')

  await page.evaluate((target) => {
    window.history.pushState({}, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForFunction((target) => window.location.pathname === target, path)
}

test('sc-034 staff list sanity screenshot', async ({ page }) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(page, '/school-admin/staff')
  await prep(page)
  await page.screenshot({ path: 'e2e/fr-015-visual.spec.ts-snapshots/sc-034-staff-list-sanity.png' })
})

test('sc-035 add-staff form + success (no role) sanity screenshots, then actually creates one', async ({
  page,
}) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(page, '/school-admin/staff/new')
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-015-visual.spec.ts-snapshots/sc-035-add-staff-form-sanity.png',
  })

  const email = `visual-check-${Date.now()}@school24.example`
  await page.getByLabel('Full name').fill('Ben Whitlock')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Position').fill('Canteen Assistant')
  await page.getByRole('button', { name: 'Send invite' }).click()
  await page.getByText('Invite sent').waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-015-visual.spec.ts-snapshots/sc-035-invite-sent-no-role-sanity.png',
  })
})

test('sc-035 add-staff WITH a role — success screenshot has no "assign a role now" prompt', async ({
  page,
}) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(page, '/school-admin/staff/new')
  await prep(page)

  const email = `visual-check-role-${Date.now()}@school24.example`
  await page.getByLabel('Full name').fill('Cara Cashier')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Position').fill('Cashier')
  await page.getByLabel('Role').selectOption({ label: 'Cashier' })
  await page.getByRole('button', { name: 'Send invite' }).click()
  await page.getByText('Invite sent').waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-015-visual.spec.ts-snapshots/sc-035-invite-sent-with-role-sanity.png',
  })
})

test('sc-095 staff detail + edit form sanity screenshots', async ({ page }) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(page, '/school-admin/staff')
  await prep(page)
  await page.getByRole('button', { name: /^Open /i }).first().click()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-015-visual.spec.ts-snapshots/sc-095-staff-detail-sanity.png',
  })

  await page.getByRole('button', { name: 'Edit details' }).click()
  await page.getByText('Edit staff member').waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-015-visual.spec.ts-snapshots/sc-035-edit-staff-form-sanity.png',
  })
})
