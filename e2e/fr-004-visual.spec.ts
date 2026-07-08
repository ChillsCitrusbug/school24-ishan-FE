// FR-004 visual-regression (Step 17 / _visual-check.md).
//
// Same two-pass pattern as e2e/fr-001-visual.spec.ts — baselines captured
// from the approved design catalog, then compared against the real FE
// build. See that file's header comment for the full rationale.
//
//   1. Capture baselines from the approved design catalog:
//      VISUAL_SOURCE=design PLAYWRIGHT_BASE_URL=http://localhost:5174 \
//        npx playwright test fr-004-visual --update-snapshots
//
//   2. Compare this build against those baselines (no seed data needed —
//      SC-006 is the unauthenticated registration form itself):
//      VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//        npx playwright test fr-004-visual

import { test, expect } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

const SCREENS = [{ name: 'sc-006-register', designHash: '#/sc-006', appPath: '/register' }]

for (const screen of SCREENS) {
  test(`${screen.name} matches the approved design`, async ({ page }) => {
    if (SOURCE === 'design') {
      await page.goto(screen.designHash)
      await page.addStyleTag({ content: '.fixed.bottom-4 { display: none !important; }' })
    } else {
      await page.goto(screen.appPath)
    }

    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts.ready)

    // Root-cause fix (2026-07-08): the earlier 0.04 tolerance here was
    // masking a real bug, not a dev-server artifact — the FE app's own
    // index.html never loaded the Poppins/Inter webfonts DESIGN loads
    // (the shared `font-sans` Tailwind token requests them, but nothing
    // ever fetched the files), so the FE build silently rendered in a
    // fallback system font, causing genuine wrap-point differences.
    // Fixed by adding the same Google Fonts <link> DESIGN already has.
    // Back to the project default tolerance now that the real cause is
    // fixed, not papered over.
    await expect(page).toHaveScreenshot(`${screen.name}.png`, {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    })
  })
}
