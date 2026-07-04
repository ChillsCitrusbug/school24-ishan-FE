// FR-016 visual-regression (Step 17 / _visual-check.md).
//
// Sanity-only screenshots, not asserted against a design baseline —
// same precedent as every prior ticket.
//
//   VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//     FR016_SA_EMAIL=<seeded> FR016_SA_PASSWORD=<seeded> \
//     FR016_STAFF_PROFILE_ID=<seeded active staff profile id> \
//     npx playwright test fr-016-visual

import { test, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function loginAndNavigateTo(page: Page, path: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR016_SA_EMAIL ?? '')
  await page.getByLabel('Password').fill(process.env.FR016_SA_PASSWORD ?? '')
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

test('sc-036 deactivate-staff confirm sanity screenshot, then actually deactivates', async ({
  page,
}) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  const staffProfileId = process.env.FR016_STAFF_PROFILE_ID ?? ''
  await loginAndNavigateTo(page, `/school-admin/staff/${staffProfileId}/status`)
  await page.getByText(/Deactivate .+\?/).waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-016-visual.spec.ts-snapshots/sc-036-deactivate-confirm-sanity.png',
    fullPage: true,
  })

  await page.getByRole('button', { name: /deactivate & email/i }).click()
  await page.waitForURL(`**/school-admin/staff/${staffProfileId}`)
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-016-visual.spec.ts-snapshots/sc-095-staff-detail-deactivated-sanity.png',
    fullPage: true,
  })
})

test('sc-036 reactivate-staff confirm sanity screenshot, then actually reactivates', async ({
  page,
}) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  const staffProfileId = process.env.FR016_STAFF_PROFILE_ID ?? ''
  await loginAndNavigateTo(page, `/school-admin/staff/${staffProfileId}/status`)
  await page.getByText(/Reactivate .+\?/).waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-016-visual.spec.ts-snapshots/sc-036-reactivate-confirm-sanity.png',
    fullPage: true,
  })

  await page.getByRole('button', { name: /reactivate & email/i }).click()
  await page.waitForURL(`**/school-admin/staff/${staffProfileId}`)
  await prep(page)
})
