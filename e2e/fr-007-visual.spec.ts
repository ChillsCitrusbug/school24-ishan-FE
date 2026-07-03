// FR-007 visual-regression (Step 17 / _visual-check.md).
//
// SC-019 (School Detail & Edit) is NOT pixel-diffed against the approved
// design baseline: the approved mock's own "Deactivate school"
// button/dialog is FR-008's own explicit scope (this ticket's own
// "Out-of-scope" line), not built here — see field-reconciliation
// decision #9. A pixel comparison against the full mock would always
// show a large, expected diff by design, not by defect — same
// precedent as FR-006's own SC-018, FR-050's own SC-101, and FR-028/030's
// own SC-052/SC-055 handling of an inconsistent/partially-out-of-scope
// mock. Covered instead by SchoolDetailScreen.test.tsx's own
// component-level assertions, plus a standalone sanity screenshot.
//
//   VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//     FR007_PA_EMAIL=<seeded> FR007_PA_PASSWORD=<seeded> \
//     FR007_SCHOOL_ID=<seeded-school-id> \
//     npx playwright test fr-007-visual

import { test, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function prep(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}

async function loginAndNavigateTo(page: Page, path: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR007_PA_EMAIL ?? '')
  await page.getByLabel('Password').fill(process.env.FR007_PA_PASSWORD ?? '')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/platform-admin')

  await page.evaluate((target) => {
    window.history.pushState({}, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForFunction((target) => window.location.pathname === target, path)
}

test('sc-019 school detail sanity screenshot (not asserted against the design baseline)', async ({
  page,
}) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  const schoolId = process.env.FR007_SCHOOL_ID ?? ''
  await loginAndNavigateTo(page, `/platform-admin/schools/${schoolId}`)
  await prep(page)
  await page.screenshot({ path: 'e2e/fr-007-visual.spec.ts-snapshots/sc-019-sanity.png' })
})

test('sc-019 reassign-admin form sanity screenshot', async ({ page }) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  const schoolId = process.env.FR007_SCHOOL_ID ?? ''
  await loginAndNavigateTo(page, `/platform-admin/schools/${schoolId}`)
  await prep(page)
  await page.getByRole('button', { name: 'Reassign admin' }).click()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-007-visual.spec.ts-snapshots/sc-019-reassign-sanity.png',
  })
})
