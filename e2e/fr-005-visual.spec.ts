// FR-005 visual-regression (Step 17 / _visual-check.md). Same two-pass
// pattern as every prior ticket this session.
//
//   1. Capture baselines from the approved design catalog:
//      VISUAL_SOURCE=design PLAYWRIGHT_BASE_URL=http://localhost:5174 \
//        npx playwright test fr-005-visual --update-snapshots
//
//   2. Compare this build against those baselines (no seeded data needed
//      — both screens are public, unauthenticated, and the 'sent'/
//      'invalid' states are reachable directly):
//      VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//        npx playwright test fr-005-visual

import { test, expect, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function prep(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}

test('sc-007-forgot (default) matches the approved design', async ({ page }) => {
  if (SOURCE === 'design') {
    await page.goto('#/sc-007')
    await page.addStyleTag({ content: '.fixed.bottom-4 { display: none !important; }' })
  } else {
    await page.goto('/forgot-password')
  }
  await prep(page)

  await expect(page).toHaveScreenshot('sc-007-forgot.png', {
    maxDiffPixelRatio: 0.04,
    animations: 'disabled',
  })
})

test('sc-007-sent matches the approved design', async ({ page }) => {
  if (SOURCE === 'design') {
    await page.goto('#/sc-007-sent')
    await page.addStyleTag({ content: '.fixed.bottom-4 { display: none !important; }' })
  } else {
    await page.goto('/forgot-password')
    await page.getByLabel('Email').fill('someone@example.com')
    await page.getByRole('button', { name: /send reset link/i }).click()
    await page.getByText('Check your email').waitFor()
  }
  await prep(page)

  await expect(page).toHaveScreenshot('sc-007-sent.png', {
    maxDiffPixelRatio: 0.04,
    animations: 'disabled',
  })
})

test('sc-008-reset (default) matches the approved design', async ({ page }) => {
  if (SOURCE === 'design') {
    await page.goto('#/sc-008')
    await page.addStyleTag({ content: '.fixed.bottom-4 { display: none !important; }' })
  } else {
    await page.goto('/reset-password?token=fake-token-for-visual-check')
  }
  await prep(page)

  await expect(page).toHaveScreenshot('sc-008-reset.png', {
    maxDiffPixelRatio: 0.04,
    animations: 'disabled',
  })
})

test('sc-008-invalid matches the approved design', async ({ page }) => {
  if (SOURCE === 'design') {
    await page.goto('#/sc-008-invalid')
    await page.addStyleTag({ content: '.fixed.bottom-4 { display: none !important; }' })
  } else {
    // No token at all — the app's own client-side "missing token" path,
    // renders the identical approved 'invalid' state.
    await page.goto('/reset-password')
  }
  await prep(page)

  await expect(page).toHaveScreenshot('sc-008-invalid.png', {
    maxDiffPixelRatio: 0.04,
    animations: 'disabled',
  })
})
