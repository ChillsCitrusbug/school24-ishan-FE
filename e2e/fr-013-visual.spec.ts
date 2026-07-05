// FR-013 visual-regression (Step 17 / _visual-check.md).
//
// Sanity-only screenshots, not asserted against a design baseline —
// same precedent as every prior ticket. Uses a real, already-seeded
// student with a genuine non-purged student_temp_credentials row.

import { test, expect, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function loginAndNavigateTo(page: Page, path: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR013_SA_EMAIL ?? '')
  await page.getByLabel('Password').fill(process.env.FR013_SA_PASSWORD ?? '')
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

test('sc-033 student credentials list sanity screenshot, then a real CSV export downloads', async ({
  page,
}) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(page, '/school-admin/students/credentials')
  await page.getByText('Student credentials').waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-013-visual.spec.ts-snapshots/sc-033-credentials-sanity.png',
    fullPage: true,
  })

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export' }).click()
  const download = await downloadPromise
  const path = await download.path()
  // Round 2 review finding (Minor): this previously only console.log'd
  // the CSV's first line with no expect() — a wrong header would have
  // passed silently. `download.path()` can be null in some CI/headless
  // environments (Playwright's own documented caveat), so this is a
  // real assertion whenever a path is available, not a no-op fallback.
  expect(path).not.toBeNull()
  if (path) {
    const fs = await import('node:fs')
    const content = fs.readFileSync(path, 'utf-8')
    // Python's csv.writer defaults to \r\n line terminators.
    expect(content.split('\n')[0].trimEnd()).toBe('Student,Student ID,Class,Temporary password')
  }
})
