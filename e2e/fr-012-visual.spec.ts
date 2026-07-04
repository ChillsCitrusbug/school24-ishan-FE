// FR-012 visual-regression (Step 17 / _visual-check.md).
//
// Sanity-only screenshots, not asserted against a design baseline —
// same precedent as every prior ticket.
//
//   VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//     FR012_SA_EMAIL=<seeded> FR012_SA_PASSWORD=<seeded> \
//     npx playwright test fr-012-visual

import { test, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function loginAndNavigateTo(page: Page, path: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR012_SA_EMAIL ?? '')
  await page.getByLabel('Password').fill(process.env.FR012_SA_PASSWORD ?? '')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')

  // A plain page.goto() here would force a full page reload, wiping the
  // in-memory-only JWT — client-side pushState (matching real Link
  // navigation) keeps the session alive, same precedent as fr-011's own
  // visual spec.
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

test('sc-029 enrol student sanity screenshot (real enrolment, real seeded class)', async ({
  page,
}) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(page, '/school-admin/students/new')
  await page.getByText('Enrol a student').waitFor()
  await page.getByLabel('Student name').fill('Visual Check Student')
  await page.getByRole('button', { name: /enrol student/i }).click()
  await page.getByText('Student enrolled').waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-012-visual.spec.ts-snapshots/sc-029-enrol-success-sanity.png',
    fullPage: true,
  })
})

test('sc-028 students list sanity screenshot (real seeded data)', async ({ page }) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(page, '/school-admin/students')
  await page.getByRole('button', { name: /add student/i }).waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-012-visual.spec.ts-snapshots/sc-028-students-list-sanity.png',
    fullPage: true,
  })
})
