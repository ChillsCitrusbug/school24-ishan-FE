// FR-006 visual-regression (Step 17 / _visual-check.md).
//
// SC-017 (Schools List) is a genuine apples-to-apples comparison — same
// columns/layout as the approved design, just real seeded data.
//
// SC-018 (Onboard New School) is NOT pixel-diffed against the approved
// design baseline: the approved Sc018Onboard.tsx mock has only 3 fields
// (School name / Admin full name / Admin email), while this ticket's own
// explicit user decision (docs/design/field-reconciliation/FR-006.md)
// deliberately extends the form to 7 fields. A pixel comparison would
// always show a large, expected diff by design, not by defect — so it
// would be meaningless as a regression signal. Covered instead by
// OnboardSchoolScreen.test.tsx's own component-level assertions, plus a
// standalone sanity screenshot captured for direct visual inspection
// (not asserted against a baseline).
//
//   1. Capture the SC-017 baseline from the approved design catalog:
//      VISUAL_SOURCE=design PLAYWRIGHT_BASE_URL=http://localhost:5174 \
//        npx playwright test fr-006-visual --update-snapshots
//
//   2. Compare this build against that baseline. Needs a real seeded
//      Platform Admin session and at least 2 onboarded schools (see the
//      seed script used in docs/gates/FR-006.md).
//      VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//        FR006_PA_EMAIL=<seeded-email> FR006_PA_PASSWORD=<seeded-password> \
//        npx playwright test fr-006-visual

import { test, expect, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function loginAndNavigateTo(page: Page, path: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR006_PA_EMAIL ?? '')
  await page.getByLabel('Password').fill(process.env.FR006_PA_PASSWORD ?? '')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/platform-admin')

  await page.evaluate((target) => {
    window.history.pushState({}, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForFunction((target) => window.location.pathname === target, path)
}

test('sc-017-schools matches the approved design', async ({ page }) => {
  if (SOURCE === 'design') {
    await page.goto('#/sc-017')
    await page.addStyleTag({ content: '.fixed.bottom-4 { display: none !important; }' })
  } else {
    await loginAndNavigateTo(page, '/platform-admin/schools')
  }

  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)

  await expect(page).toHaveScreenshot('sc-017-schools.png', {
    maxDiffPixelRatio: 0.04,
    animations: 'disabled',
    // "Showing X of X" (real count, no pagination built yet) vs the
    // design mock's own hardcoded "Showing X of 24" — same "no real
    // backing data source yet, not fabricated" precedent as FR-018's own
    // omitted badge counts. Masked, not chased.
    mask: [page.locator('text=Showing')],
  })
})

test('sc-017-empty matches the approved design', async ({ page }) => {
  // App-side comparison needs a Platform Admin session with zero
  // onboarded schools — no separate empty-DB seed is maintained for
  // this build; covered instead by SchoolsListScreen.test.tsx's own
  // empty-state assertion.
  test.skip(SOURCE !== 'design', 'covered by SchoolsListScreen.test.tsx — no separate empty-DB seed')

  await page.goto('#/sc-017-empty')
  await page.addStyleTag({ content: '.fixed.bottom-4 { display: none !important; }' })
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)

  await expect(page).toHaveScreenshot('sc-017-empty.png', {
    maxDiffPixelRatio: 0.04,
    animations: 'disabled',
  })
})

test('sc-018-onboard sanity screenshot (not asserted against the design baseline)', async ({
  page,
}) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(page, '/platform-admin/schools/new')
  await page.waitForLoadState('networkidle')
  // Direct evidence only — no toHaveScreenshot assertion (see file header).
  await page.screenshot({ path: 'e2e/fr-006-visual.spec.ts-snapshots/sc-018-onboard-sanity.png' })
})
