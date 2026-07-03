// FR-009 visual-regression (Step 17 / _visual-check.md).
//
// Sanity-only screenshots, not asserted against a design baseline — same
// precedent as every prior ticket in this batch. SC-020's own role
// filter and SC-021's own deactivate-confirm dialog are approved mock
// states this ticket wires for real.
//
//   VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//     FR009_PA_EMAIL=<seeded> FR009_PA_PASSWORD=<seeded> \
//     FR009_STAFF_USER_ID=<seeded-user-id> \
//     npx playwright test fr-009-visual

import { test, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function prep(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}

async function loginAndNavigateTo(page: Page, path: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR009_PA_EMAIL ?? '')
  await page.getByLabel('Password').fill(process.env.FR009_PA_PASSWORD ?? '')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/platform-admin')

  await page.evaluate((target) => {
    window.history.pushState({}, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForFunction((target) => window.location.pathname === target, path)
}

test('sc-020 cross-school users list sanity screenshot', async ({ page }) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(page, '/platform-admin/users')
  await prep(page)
  await page.screenshot({ path: 'e2e/fr-009-visual.spec.ts-snapshots/sc-020-users-list-sanity.png' })

  await page.getByRole('button', { name: 'Staff', exact: true }).click()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-009-visual.spec.ts-snapshots/sc-020-users-list-staff-filter-sanity.png',
  })
})

test('sc-021 user detail + deactivate-confirm dialog sanity screenshot, then actually confirms it', async ({
  page,
}) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  const userId = process.env.FR009_STAFF_USER_ID ?? ''
  await loginAndNavigateTo(page, `/platform-admin/users/${userId}`)
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-009-visual.spec.ts-snapshots/sc-021-user-detail-sanity.png',
  })

  await page.getByRole('button', { name: 'Deactivate user' }).click()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-009-visual.spec.ts-snapshots/sc-021-deactivate-dialog-sanity.png',
  })

  await page.getByRole('button', { name: 'Deactivate & email' }).click()
  await prep(page)
  // The status-change button swaps variant (danger -> secondary) via a
  // CSS `transition` on the same DOM node (React reconciles it in place
  // rather than remounting) — a short settle wait avoids capturing a
  // mid-transition frame in the sanity screenshot.
  await page.waitForTimeout(300)
  await page.screenshot({
    path: 'e2e/fr-009-visual.spec.ts-snapshots/sc-021-deactivated-sanity.png',
  })

  // Restore the seeded account to its normal active state so other
  // tickets' own visual checks (which may reuse this same seeded user)
  // aren't left with unexpected state.
  await page.getByRole('button', { name: 'Reactivate user' }).click()
  await prep(page)
})
