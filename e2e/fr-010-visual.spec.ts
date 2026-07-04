// FR-010 visual-regression (Step 17 / _visual-check.md).
//
// Sanity-only screenshots, not asserted against a design baseline —
// same precedent as every prior ticket.
//
//   VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//     FR010_PA_EMAIL=<seeded> FR010_PA_PASSWORD=<seeded> \
//     npx playwright test fr-010-visual

import { test, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function prep(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}

test('sc-016 platform dashboard sanity screenshot (real seeded data)', async ({ page }) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR010_PA_EMAIL ?? '')
  await page.getByLabel('Password').fill(process.env.FR010_PA_PASSWORD ?? '')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/platform-admin')
  await page.getByText('Platform overview').waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-010-visual.spec.ts-snapshots/sc-016-platform-dashboard-sanity.png',
    fullPage: true,
  })
})
