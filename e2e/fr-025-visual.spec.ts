// FR-025 visual-regression (Step 17 / _visual-check.md).
//
// Sanity-only screenshots, not asserted against a design baseline —
// same precedent as every prior ticket.
//
//   VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//     FR025_SA_EMAIL=<seeded> FR025_SA_PASSWORD=<seeded> \
//     npx playwright test fr-025-visual

import { test, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function loginAndNavigateTo(page: Page, path: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR025_SA_EMAIL ?? '')
  await page.getByLabel('Password').fill(process.env.FR025_SA_PASSWORD ?? '')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')

  await page.evaluate((target) => {
    window.history.pushState({}, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForFunction((target) => window.location.pathname === target, path)
}

async function prep(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}

test('sc-049 create-combo form sanity screenshot, then actually creates one', async ({ page }) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(page, '/school-admin/combos/new')
  await page.getByText('Create a combo').waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-025-visual.spec.ts-snapshots/sc-049-combo-form-sanity.png',
    fullPage: true,
  })

  const label = `Visual Check Combo ${Date.now()}`
  await page.getByLabel('Combo name').fill(label)
  const firstCheckbox = page.getByRole('checkbox').first()
  await firstCheckbox.click()
  await page.getByLabel('Combo price').fill('4.50')
  await page.getByRole('button', { name: 'Save combo' }).click()
  await page.waitForURL('**/school-admin/combos')
  await prep(page)
})

test('sc-048 combos list sanity screenshot (real seeded combo)', async ({ page }) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(page, '/school-admin/combos')
  await page.getByRole('button', { name: /add combo/i }).waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-025-visual.spec.ts-snapshots/sc-048-combos-list-sanity.png',
    fullPage: true,
  })
})
