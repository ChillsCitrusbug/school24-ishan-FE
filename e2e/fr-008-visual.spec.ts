// FR-008 visual-regression (Step 17 / _visual-check.md).
//
// Sanity-only screenshots, not asserted against a design baseline — same
// precedent as every prior ticket in this batch. SC-019's own
// deactivate-confirm dialog state and SC-013's own "suspended" copy are
// both approved mock states this ticket wires for real.
//
//   VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//     FR008_PA_EMAIL=<seeded> FR008_PA_PASSWORD=<seeded> \
//     FR008_SCHOOL_ID=<seeded-school-id> \
//     npx playwright test fr-008-visual

import { test, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function prep(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}

async function loginAndNavigateTo(page: Page, path: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR008_PA_EMAIL ?? '')
  await page.getByLabel('Password').fill(process.env.FR008_PA_PASSWORD ?? '')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/platform-admin')

  await page.evaluate((target) => {
    window.history.pushState({}, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForFunction((target) => window.location.pathname === target, path)
}

test('sc-019 deactivate-confirm dialog sanity screenshot, then actually confirms it', async ({
  page,
}) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  const schoolId = process.env.FR008_SCHOOL_ID ?? ''
  await loginAndNavigateTo(page, `/platform-admin/schools/${schoolId}`)
  await prep(page)
  await page.getByRole('button', { name: 'Deactivate school' }).click()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-008-visual.spec.ts-snapshots/sc-019-deactivate-dialog-sanity.png',
  })
  // Actually confirm the deactivation — the next test relies on this
  // school now being genuinely inactive, to observe the real SC-013
  // "suspended" screen on the SA's own next login attempt.
  await page.getByRole('button', { name: 'Deactivate school' }).nth(1).click()
  await prep(page)
})

test('sc-013 school-suspended blocked screen sanity screenshot', async ({ page }) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR008_SA_EMAIL ?? '')
  await page.getByLabel('Password').fill(process.env.FR008_SA_PASSWORD ?? '')
  await page.getByRole('button', { name: /sign in/i }).click()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-008-visual.spec.ts-snapshots/sc-013-suspended-sanity.png',
  })
})
