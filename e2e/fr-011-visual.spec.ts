// FR-011 visual-regression (Step 17 / _visual-check.md).
//
// Sanity-only screenshots, not asserted against a design baseline — same
// precedent as every prior ticket in this batch. SC-024/025/026's own
// approved layouts are wired for real here (field-reconciliation
// decision #1: Year/Teacher columns dropped, no backing DB columns).
//
//   VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//     FR011_SA_EMAIL=<seeded> FR011_SA_PASSWORD=<seeded> \
//     FR011_CLASS_ID=<seeded-class-id-with-1-enrolled-student> \
//     npx playwright test fr-011-visual

import { test, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function prep(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}

async function loginAndNavigateTo(page: Page, path: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR011_SA_EMAIL ?? '')
  await page.getByLabel('Password').fill(process.env.FR011_SA_PASSWORD ?? '')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')

  await page.evaluate((target) => {
    window.history.pushState({}, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForFunction((target) => window.location.pathname === target, path)
}

test('sc-024 classes list sanity screenshot', async ({ page }) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(page, '/school-admin/classes')
  await prep(page)
  await page.screenshot({ path: 'e2e/fr-011-visual.spec.ts-snapshots/sc-024-classes-list-sanity.png' })
})

test('sc-025 create-class form sanity screenshot, then actually creates one', async ({ page }) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(page, '/school-admin/classes/new')
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-011-visual.spec.ts-snapshots/sc-025-create-class-form-sanity.png',
  })

  const label = `Visual Check ${Date.now()}`
  await page.getByLabel('Class label').fill(label)
  await page.getByRole('button', { name: 'Save class' }).click()
  await page.waitForURL('**/school-admin/classes')
  await prep(page)
})

test('class detail (Scenario 4) with a real enrolled student sanity screenshot', async ({
  page,
}) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  const classId = process.env.FR011_CLASS_ID ?? ''
  await loginAndNavigateTo(page, `/school-admin/classes/${classId}`)
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-011-visual.spec.ts-snapshots/class-detail-with-student-sanity.png',
  })
})

test('sc-026 delete-confirm BLOCKED state sanity screenshot (real enrolled student)', async ({
  page,
}) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  const classId = process.env.FR011_CLASS_ID ?? ''
  await loginAndNavigateTo(page, `/school-admin/classes/${classId}/delete`)
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-011-visual.spec.ts-snapshots/sc-026-delete-blocked-sanity.png',
  })
})

test('edit form + sc-026 default (destructive-confirm) state, then actually deletes it', async ({
  page,
}) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(page, '/school-admin/classes/new')
  await prep(page)
  const label = `Delete Me ${Date.now()}`
  await page.getByLabel('Class label').fill(label)
  await page.getByRole('button', { name: 'Save class' }).click()
  await page.waitForURL('**/school-admin/classes')
  await prep(page)

  await page.getByRole('button', { name: `Open ${label}` }).click()
  await prep(page)
  await page.getByRole('button', { name: 'Edit' }).click()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-011-visual.spec.ts-snapshots/sc-025-edit-class-form-sanity.png',
  })

  await page.getByRole('button', { name: 'Cancel' }).click()
  await page.waitForURL('**/school-admin/classes')
  await prep(page)
  await page.getByRole('button', { name: `Open ${label}` }).click()
  await prep(page)
  await page.getByRole('button', { name: 'Delete' }).click()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-011-visual.spec.ts-snapshots/sc-026-delete-default-sanity.png',
  })

  await page.getByRole('button', { name: 'Delete class' }).click()
  await prep(page)
})
