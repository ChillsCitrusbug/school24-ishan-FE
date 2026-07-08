// FR-003 visual-regression (Step 17 / _visual-check.md).
//
// Same two-pass pattern as e2e/fr-004-visual.spec.ts — baselines captured
// from the approved design catalog, then compared against the real FE
// build.
//
//   1. Capture baselines from the approved design catalog:
//      VISUAL_SOURCE=design PLAYWRIGHT_BASE_URL=http://localhost:5174 \
//        npx playwright test fr-003-visual --update-snapshots
//
//   2. Compare this build against those baselines. The `default` state
//      needs a valid, unexpired invitation token seeded first (the app
//      route does a real peek call on mount, unlike the design catalog's
//      static mock) — see the backend seed step in the gate doc.
//      VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//        npx playwright test fr-003-visual

import { test, expect } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'
const SEEDED_TOKEN = process.env.FR003_SEEDED_TOKEN ?? ''

const SCREENS = [
  {
    name: 'sc-004-activate',
    designHash: '#/sc-004',
    appPath: `/activate?token=${SEEDED_TOKEN}`,
  },
  { name: 'sc-004-activate-expired', designHash: '#/sc-004-expired', appPath: '/activate' },
]

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

    // Root-cause fix (2026-07-08): the earlier 0.04 tolerance here (and
    // in fr-004-visual.spec.ts) was masking a real bug, not a dev-server
    // artifact — see fr-004-visual.spec.ts's own comment for the full
    // diagnosis (FE's index.html never loaded the Poppins/Inter webfonts
    // DESIGN loads). Fixed; back to the project default tolerance.
    await expect(page).toHaveScreenshot(`${screen.name}.png`, {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    })
  })
}
