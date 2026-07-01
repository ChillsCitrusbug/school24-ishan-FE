// FR-001 visual-regression (Step 17 / _visual-check.md).
//
// Baseline screenshots are generated from the APPROVED design component,
// not a previous build (see e2e/_EXAMPLE_visual.example.ts's own note).
// Run in two passes against the SAME spec, pointed at different apps via
// VISUAL_SOURCE:
//
//   1. Capture baselines from the approved design catalog:
//      VISUAL_SOURCE=design PLAYWRIGHT_BASE_URL=http://localhost:5174 \
//        npx playwright test fr-001-visual --update-snapshots
//
//   2. Seed the School Admin test user the `app` pass logs in as (review
//      finding, FR-001 — this is what makes the pass actually
//      reproducible, not a one-off manually-created account):
//      cd school24-ishan-BE && python scripts/seed_visual_check_user.py
//
//   3. Compare this build against those baselines:
//      VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//        npx playwright test fr-001-visual
//
//   4. Tear the seeded user back down:
//      python scripts/seed_visual_check_user.py --teardown
//
// The design catalog's FloatingNav (bottom-bar catalog/state-switcher) is
// a design-TOOL affordance, not part of the approved screen itself, so it
// is masked out of both the baseline capture and the comparison.

import { test, expect, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

// Must match school24-ishan-BE/scripts/seed_visual_check_user.py exactly.
const SCHOOL_ADMIN_EMAIL = process.env.E2E_SCHOOL_ADMIN_EMAIL ?? 'visualcheck-sa@example.com'
const SCHOOL_ADMIN_PASSWORD = process.env.E2E_SCHOOL_ADMIN_PASSWORD ?? 'VisualCheck123!'

const SCREENS = [
  { name: 'sc-001-login', designHash: '#/sc-001', appPath: '/login' },
  { name: 'sc-023-dashboard-empty', designHash: '#/sc-023-empty', appPath: '/school-admin' },
]

async function loginAsSchoolAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(SCHOOL_ADMIN_EMAIL)
  await page.getByLabel('Password').fill(SCHOOL_ADMIN_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')
}

for (const screen of SCREENS) {
  test(`${screen.name} matches the approved design`, async ({ page }) => {
    if (SOURCE === 'design') {
      await page.goto(screen.designHash)
      // The catalog's floating "Catalog / state switcher" bar is a design-
      // tool affordance, not part of the approved screen — hide it before
      // capturing so it never enters the baseline.
      await page.addStyleTag({ content: '.fixed.bottom-4 { display: none !important; }' })
    } else {
      if (screen.appPath === '/school-admin') {
        await loginAsSchoolAdmin(page)
      } else {
        await page.goto(screen.appPath)
      }
    }

    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot(`${screen.name}.png`, {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    })
  })
}
