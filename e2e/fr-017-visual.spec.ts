// FR-017 visual-regression (Step 17 / _visual-check.md).
//
// Same two-pass pattern as e2e/fr-003-visual.spec.ts.
//
//   1. Capture baselines from the approved design catalog:
//      VISUAL_SOURCE=design PLAYWRIGHT_BASE_URL=http://localhost:5174 \
//        npx playwright test fr-017-visual --update-snapshots
//
//   2. Compare this build against those baselines. Both screens are
//      School Admin-only (RequireRole) — the app pass logs in for real
//      through the login form each test (the access token lives
//      in-memory only, per agents/frontend.md, so it can't be seeded via
//      localStorage/cookies the way a persisted-token app could).
//      Needs a real seeded School Admin (email/password below) in the
//      dev DB first.
//      VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//        FR017_SA_EMAIL=<seeded-email> FR017_SA_PASSWORD=<seeded-password> \
//        npx playwright test fr-017-visual
//
// The populated `sc-037` (3 demo roles) list state is intentionally NOT
// visual-checked here: the design mock's own placeholder data uses a
// different 5-module set ("Orders", "Reports", ...) than the ticket's
// real 4x4 set (see docs/design/field-reconciliation/FR-017.md item 1),
// so a literal pixel comparison against mismatched demo content would
// not be meaningful — the shared Card/Badge/EmptyState primitives this
// screen reuses are already visually proven correct via sc-037-empty and
// other screens' own checks; the summary/badge computation itself is
// covered by RolesListScreen.test.tsx instead.

import { test, expect, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

/** Logs in for real, then reaches the target route via genuine SPA
 * client-side navigation (history.pushState + popstate) rather than
 * page.goto() — the app has no in-app link to the roles screens yet
 * (deliberate: the sidebar's "Staff" item has no href, since a raw
 * `<a href>`/page.goto() triggers a real navigation that wipes the
 * in-memory-only access token, agents/frontend.md). A real page.goto()
 * here would reproduce that exact bug against the test itself. */
async function loginAndNavigateTo(page: Page, path: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR017_SA_EMAIL ?? '')
  await page.getByLabel('Password').fill(process.env.FR017_SA_PASSWORD ?? '')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')

  await page.evaluate((target) => {
    window.history.pushState({}, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForFunction(
    (target) => window.location.pathname === target,
    path,
  )
}

test('sc-037-empty matches the approved design', async ({ page }) => {
  if (SOURCE === 'design') {
    await page.goto('#/sc-037-empty')
    await page.addStyleTag({ content: '.fixed.bottom-4 { display: none !important; }' })
  } else {
    await loginAndNavigateTo(page, '/school-admin/roles')
  }

  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)

  await expect(page).toHaveScreenshot('sc-037-empty.png', {
    maxDiffPixelRatio: 0.02,
    animations: 'disabled',
  })
})

test('sc-038 (create, empty form) matches the approved design', async ({ page }) => {
  if (SOURCE === 'design') {
    await page.goto('#/sc-038')
    await page.addStyleTag({ content: '.fixed.bottom-4 { display: none !important; }' })
    // The design mock always renders its own "edit" demo state
    // (pre-filled name, partially-checked matrix) — cleared here so the
    // baseline represents the same semantic state FR-017's own CREATE
    // screen renders (empty name, nothing checked), a fair comparison
    // rather than comparing a create screen against an edit demo. Uses
    // Playwright's own locators (not a raw querySelector) since the
    // Topbar's search input also has no `type` attribute and would
    // otherwise be matched first.
    await page.getByLabel('Role name').fill('')
    const checkedBoxes = page.locator('button[role="checkbox"][aria-checked="true"]')
    while ((await checkedBoxes.count()) > 0) {
      await checkedBoxes.first().click()
    }
  } else {
    await loginAndNavigateTo(page, '/school-admin/roles/new')
  }

  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)

  await expect(page).toHaveScreenshot('sc-038-create.png', {
    maxDiffPixelRatio: 0.02,
    animations: 'disabled',
  })
})
