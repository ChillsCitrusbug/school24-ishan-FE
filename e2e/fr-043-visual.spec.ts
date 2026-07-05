// FR-043 visual-regression (Step 17 / _visual-check.md).
//
// Sanity-only screenshots, not asserted against a design baseline —
// same precedent as every prior ticket. Also genuinely composes and
// sends a real notification against the running backend (the JWT is
// in-memory-only, not localStorage — same as every prior ticket's own
// visual spec — so persistence is verified with a direct DB query run
// separately after this test, not from within the test itself).
//
// Round 2 review finding (Minor): this run's own composed row is left
// in the shared dev DB with no teardown — there is deliberately no
// DELETE endpoint to clean it up with (notifications are an immutable
// record by design, DATABASE_SCHEMA.dbml's own explicit note). This
// is the same "real create, no teardown" precedent every prior
// ticket's own visual spec already followed (e.g. fr-025-visual's
// combo creation) — accepted here too, on the condition that any test
// touching these tables scopes its own assertions to a fresh
// school/notification id (see test_notifications.py's own
// `_assert_nothing_persisted_for` helper), never an unscoped global
// count. FR-044/FR-052 — the next tickets to build on these same
// tables — should follow that same scoping discipline from the start.

import { test, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function loginAndNavigateTo(page: Page, path: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR043_SA_EMAIL ?? '')
  await page.getByLabel('Password').fill(process.env.FR043_SA_PASSWORD ?? '')
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

test('sc-088 compose screen sanity screenshot (zero-recipients state), then a real compose+send persists', async ({
  page,
}) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(page, '/school-admin/notifications/new')
  await page.getByText('Send a notification').waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-043-visual.spec.ts-snapshots/sc-088-compose-zero-recipients-sanity.png',
    fullPage: true,
  })

  const uniqueTitle = `Visual Check Notification ${Date.now()}`
  await page.getByLabel('Title').fill(uniqueTitle)
  await page.getByLabel('Message').fill('Sent by the FR-043 visual check.')
  await page.getByRole('checkbox', { name: 'Staff' }).click()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-043-visual.spec.ts-snapshots/sc-088-compose-filled-sanity.png',
    fullPage: true,
  })

  await page.getByRole('button', { name: 'Send notification' }).click()
  await page.waitForURL('**/school-admin')
  // Persistence is independently confirmed with a direct DB query run
  // separately after this test (see the ticket's own gate doc) —
  // uniqueTitle above is what that query looks for.
  console.log(`FR-043 visual check composed notification titled: ${uniqueTitle}`)
})
