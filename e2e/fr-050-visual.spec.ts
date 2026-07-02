// FR-050 visual-regression (Step 17 / _visual-check.md).
//
// SC-100 (login challenge) is a genuine apples-to-apples comparison —
// same layout as the approved design, just a real 2FA-enabled session.
//
// SC-101 is NOT pixel-diffed against the approved design baseline: the
// approved Sc101TwoFactorSetup.tsx mock has a full "Authenticator app vs.
// Email code" method picker with a QR-code enrollment path, while this
// ticket's own explicit Interaction contract overrides that entirely —
// "Method is fixed to email OTP — no method-select branching in the UI
// or API" (field-reconciliation "tension" section). A pixel comparison
// would always show a large, expected diff by design, not by defect —
// same precedent as FR-006's own SC-018 (a deliberately-extended form
// vs. its own inconsistent mock). Covered instead by
// TwoFactorSetupScreen.test.tsx's own component-level assertions (all
// 4 states), plus one standalone sanity screenshot of the "off" state
// for direct visual inspection (not asserted against a baseline).
//
// Same history.pushState + popstate client-side-navigation technique as
// fr-048-visual.spec.ts's own `loginAndNavigateTo` for the setup screen
// (an authenticated route) — a plain page.goto() after login destroys
// the in-memory-only access token.
//
//   1. Capture the SC-100 baseline from the approved design catalog:
//      VISUAL_SOURCE=design PLAYWRIGHT_BASE_URL=http://localhost:5174 \
//        npx playwright test fr-050-visual --update-snapshots
//
//   2. Compare this build against that baseline. Needs a real seeded
//      School Admin account with 2FA already enabled (credentials via
//      env vars, per FR-006/018/048's own precedent):
//      VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//        FR050_SA_2FA_EMAIL=<seeded> FR050_SA_2FA_PASSWORD=<seeded> \
//        FR050_SA_EMAIL=<seeded, 2FA off> FR050_SA_PASSWORD=<seeded, 2FA off> \
//        npx playwright test fr-050-visual

import { test, expect, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function prep(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}

async function hideFixedElements(page: Page): Promise<void> {
  await page.addStyleTag({ content: '.fixed.bottom-4 { display: none !important; }' })
}

async function loginAndNavigateTo(
  page: Page,
  email: string,
  password: string,
  path: string,
): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')

  await page.evaluate((target) => {
    window.history.pushState({}, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForFunction((target) => window.location.pathname === target, path)
}

test('sc-100 (default) matches the approved design', async ({ page }) => {
  if (SOURCE === 'design') {
    await page.goto('#/sc-100')
    await hideFixedElements(page)
  } else {
    await page.goto('/login')
    await page.getByLabel('Email').fill(process.env.FR050_SA_2FA_EMAIL ?? '')
    await page.getByLabel('Password').fill(process.env.FR050_SA_2FA_PASSWORD ?? '')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('**/two-factor-challenge')
  }
  await prep(page)

  await expect(page).toHaveScreenshot('sc-100.png', {
    maxDiffPixelRatio: 0.04,
    animations: 'disabled',
  })
})

test('sc-101-off sanity screenshot (not asserted against the design baseline)', async ({
  page,
}) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(
    page,
    process.env.FR050_SA_EMAIL ?? '',
    process.env.FR050_SA_PASSWORD ?? '',
    '/two-factor-setup',
  )
  await prep(page)
  await page.screenshot({ path: 'e2e/fr-050-visual.spec.ts-snapshots/sc-101-off-sanity.png' })
})

// No sc-101-on sanity screenshot here: reaching it requires completing a
// full 2FA login first (the seeded FR050_SA_2FA_* account can't jump
// straight to /school-admin like loginAndNavigateTo assumes). That state
// is already covered by TwoFactorSetupScreen.test.tsx's own
// "shows the on state for a user with 2FA already enabled" assertion.
