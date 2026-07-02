// FR-018 visual-regression (Step 17 / _visual-check.md).
//
// Same two-pass pattern as e2e/fr-017-visual.spec.ts.
//
//   1. Capture baselines from the approved design catalog:
//      VISUAL_SOURCE=design PLAYWRIGHT_BASE_URL=http://localhost:5174 \
//        npx playwright test fr-018-visual --update-snapshots
//
//   2. Compare this build against those baselines. Needs a real seeded
//      School Admin session (email/password), plus a role named
//      "Canteen Staff" (0 staff assigned) and a second role with exactly
//      5 staff assigned, seeded to match the design mock's own copy for
//      a fair comparison (see the seed script in docs/gates/FR-018.md).
//      VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//        FR018_SA_EMAIL=<seeded-email> FR018_SA_PASSWORD=<seeded-password> \
//        FR018_EMPTY_ROLE_ID=<role-with-0-staff> FR018_ASSIGNED_ROLE_ID=<role-with-5-staff> \
//        npx playwright test fr-018-visual
//
// SC-040's populated (default) state and SC-041's populated (default)
// state are intentionally NOT visual-checked — same reasoning as
// FR-017's own populated roles list: the design mock's own placeholder
// role/module names don't match the ticket's real data (see
// docs/design/field-reconciliation/FR-018.md item 7), so a literal pixel
// comparison against mismatched demo content wouldn't be meaningful.
// Covered instead by AssignRoleScreen.test.tsx/StaffPortalScreen.test.tsx's
// own component-level assertions.

import { test, expect, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function loginAndNavigateTo(page: Page, path: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR018_SA_EMAIL ?? '')
  await page.getByLabel('Password').fill(process.env.FR018_SA_PASSWORD ?? '')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')

  await page.evaluate((target) => {
    window.history.pushState({}, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForFunction((target) => window.location.pathname === target, path)
}

const SCREENS = [
  {
    name: 'sc-039-confirm',
    designHash: '#/sc-039',
    appPathEnvVar: 'FR018_EMPTY_ROLE_ID',
    appPathPrefix: '/school-admin/roles/',
    appPathSuffix: '/delete',
  },
  {
    name: 'sc-039-assigned',
    designHash: '#/sc-039-assigned',
    appPathEnvVar: 'FR018_ASSIGNED_ROLE_ID',
    appPathPrefix: '/school-admin/roles/',
    appPathSuffix: '/delete',
  },
]

for (const screen of SCREENS) {
  test(`${screen.name} matches the approved design`, async ({ page }) => {
    if (SOURCE === 'design') {
      await page.goto(screen.designHash)
      await page.addStyleTag({ content: '.fixed.bottom-4 { display: none !important; }' })
    } else {
      const roleId = process.env[screen.appPathEnvVar] ?? ''
      await loginAndNavigateTo(page, `${screen.appPathPrefix}${roleId}${screen.appPathSuffix}`)
    }

    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts.ready)

    await expect(page).toHaveScreenshot(`${screen.name}.png`, {
      maxDiffPixelRatio: 0.04,
      animations: 'disabled',
    })
  })
}

test('sc-040-empty matches the approved design', async ({ page }) => {
  if (SOURCE === 'design') {
    await page.goto('#/sc-040-empty')
    await page.addStyleTag({ content: '.fixed.bottom-4 { display: none !important; }' })
  } else {
    // Any staffId works — the empty-roles state doesn't depend on which
    // staff member, only on there being no roles in the school (a fresh
    // seed with no roles created yet).
    await loginAndNavigateTo(page, `/school-admin/staff/${process.env.FR018_EMPTY_SCHOOL_STAFF_ID ?? ''}/assign-role`)
  }

  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)

  await expect(page).toHaveScreenshot('sc-040-empty.png', {
    maxDiffPixelRatio: 0.04,
    animations: 'disabled',
  })
})

test('sc-041-norole matches the approved design', async ({ page }) => {
  if (SOURCE === 'design') {
    await page.goto('#/sc-041-norole')
    await page.addStyleTag({ content: '.fixed.bottom-4 { display: none !important; }' })
  } else {
    await page.goto('/login')
    await page.getByLabel('Email').fill(process.env.FR018_STAFF_EMAIL ?? '')
    await page.getByLabel('Password').fill(process.env.FR018_STAFF_PASSWORD ?? '')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('**/staff')
  }

  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)

  await expect(page).toHaveScreenshot('sc-041-norole.png', {
    maxDiffPixelRatio: 0.04,
    animations: 'disabled',
  })
})
