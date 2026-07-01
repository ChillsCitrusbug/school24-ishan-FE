// FR-002 visual-regression (Step 17 / _visual-check.md).
//
// Same two-pass pattern as e2e/fr-001-visual.spec.ts — baselines captured
// from the approved design catalog, then compared against the real FE
// build. See that file's header comment for the full rationale.
//
//   1. Capture baselines from the approved design catalog:
//      VISUAL_SOURCE=design PLAYWRIGHT_BASE_URL=http://localhost:5174 \
//        npx playwright test fr-002-visual --update-snapshots
//
//   2. Seed the two test students the `app` pass logs in as:
//      cd school24-ishan-BE && python scripts/seed_visual_check_student.py
//
//   3. Compare this build against those baselines:
//      VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//        npx playwright test fr-002-visual
//
//   4. Tear the seeded students back down:
//      python scripts/seed_visual_check_student.py --teardown

import { test, expect, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

// Must match school24-ishan-BE/scripts/seed_visual_check_student.py exactly.
const FIRST_LOGIN_STUDENT_ID = process.env.E2E_FIRST_LOGIN_STUDENT_ID ?? 'S-VC0002'
const FIRST_LOGIN_PASSWORD = process.env.E2E_FIRST_LOGIN_PASSWORD ?? 'TempVisualCheck1!'

const SCREENS = [
  { name: 'sc-002-student-login', designHash: '#/sc-002', appPath: '/student-login' },
  {
    name: 'sc-003-first-login-password-change',
    designHash: '#/sc-003',
    appPath: '/student-first-login',
  },
]

async function reachFirstLoginScreen(page: Page) {
  await page.goto('/student-login')
  await page.getByLabel('Student ID').fill(FIRST_LOGIN_STUDENT_ID)
  await page.getByLabel('Password').fill(FIRST_LOGIN_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/student-first-login')
}

for (const screen of SCREENS) {
  test(`${screen.name} matches the approved design`, async ({ page }) => {
    if (SOURCE === 'design') {
      await page.goto(screen.designHash)
      await page.addStyleTag({ content: '.fixed.bottom-4 { display: none !important; }' })
    } else if (screen.appPath === '/student-first-login') {
      await reachFirstLoginScreen(page)
    } else {
      await page.goto(screen.appPath)
    }

    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot(`${screen.name}.png`, {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    })
  })
}
