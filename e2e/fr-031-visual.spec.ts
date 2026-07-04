// FR-031 visual-regression (Step 17 / _visual-check.md).
//
// Sanity-only screenshots, not asserted against a design baseline —
// same precedent as every prior ticket.
//
//   VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//     FR031_PARENT_EMAIL=<seeded> FR031_PARENT_PASSWORD=<seeded> \
//     FR031_STUDENT_ID=<seeded> FR031_STUDENT_PASSWORD=<seeded> \
//     npx playwright test fr-031-visual

import { test, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function prep(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}

async function loginAsParentAndNavigateTo(page: Page, path: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR031_PARENT_EMAIL ?? '')
  await page.getByLabel('Password').fill(process.env.FR031_PARENT_PASSWORD ?? '')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/parent')

  await page.evaluate((target) => {
    window.history.pushState({}, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForFunction((target) => window.location.pathname === target, path)
}

async function loginAsStudentAndNavigateTo(page: Page, path: string): Promise<void> {
  await page.goto('/student-login')
  await page.getByLabel('Student ID').fill(process.env.FR031_STUDENT_ID ?? '')
  await page.getByLabel('Password').fill(process.env.FR031_STUDENT_PASSWORD ?? '')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/student')

  await page.evaluate((target) => {
    window.history.pushState({}, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForFunction((target) => window.location.pathname === target, path)
}

test('sc-051 wallet overview sanity screenshot (Parent)', async ({ page }) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAsParentAndNavigateTo(page, '/parent/wallet')
  await page.getByText('Your wallet').waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-031-visual.spec.ts-snapshots/sc-051-wallet-overview-parent-sanity.png',
  })
})

test('sc-058 transaction history sanity screenshot (Parent, all 3 types)', async ({ page }) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAsParentAndNavigateTo(page, '/parent/wallet/history')
  await page.getByText('Transaction history').waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-031-visual.spec.ts-snapshots/sc-058-txn-history-parent-sanity.png',
  })

  await page.getByRole('button', { name: 'Refunds' }).click()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-031-visual.spec.ts-snapshots/sc-058-txn-history-filtered-refunds-sanity.png',
  })
})

test('sc-051 wallet overview sanity screenshot (Student)', async ({ page }) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAsStudentAndNavigateTo(page, '/student/wallet')
  await page.getByText('Your wallet').waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-031-visual.spec.ts-snapshots/sc-051-wallet-overview-student-sanity.png',
  })
})
