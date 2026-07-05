// FR-027 visual-regression (Step 17 / _visual-check.md).
//
// Sanity screenshot, not asserted against a design baseline — same
// precedent as every prior ticket. Also performs a REAL mouse drag
// (Playwright can simulate genuine pointer events, unlike jsdom) and
// asserts on the resulting DOM order, to prove @dnd-kit's reordering
// actually persists end-to-end, not just that the screen renders.
//
// Round 3 review finding (Major): the original version of this test
// had zero `expect()` calls (so it could only fail on a thrown
// exception, never on a failed/no-op reorder) and targeted "the first
// two `[aria-label^="Drag "]` elements" on the assumption they were
// the two category handles — actually false, since each category
// renders its OWN drag handle immediately followed by its own nested
// PRODUCT handles, so "the second handle" was really the first
// category's own first product. Fixed by giving category-level
// handles/names their own `data-testid` (distinct from product rows)
// and asserting on the real, resulting DOM order after Save.
//
//   VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//     FR027_SA_EMAIL=<seeded> FR027_SA_PASSWORD=<seeded> \
//     npx playwright test fr-027-visual

import { test, expect, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function loginAndNavigateTo(page: Page, path: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR027_SA_EMAIL ?? '')
  await page.getByLabel('Password').fill(process.env.FR027_SA_PASSWORD ?? '')
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

async function categoryNamesInOrder(page: Page): Promise<string[]> {
  return page.locator('[data-testid="category-name"]').allTextContents()
}

test('sc-050 menu display order sanity screenshot, then a real drag genuinely reorders and persists categories', async ({
  page,
}) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(page, '/school-admin/products/order')
  await page.getByText('Menu display order').waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-027-visual.spec.ts-snapshots/sc-050-display-order-sanity.png',
    fullPage: true,
  })

  const categoryHandles = page.locator('[data-testid="category-drag-handle"]')
  const categoryCount = await categoryHandles.count()
  expect(categoryCount).toBeGreaterThanOrEqual(2)

  const namesBefore = await categoryNamesInOrder(page)
  const firstBox = await categoryHandles.nth(0).boundingBox()
  const secondBox = await categoryHandles.nth(1).boundingBox()
  expect(firstBox).not.toBeNull()
  expect(secondBox).not.toBeNull()
  if (firstBox && secondBox) {
    await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(
      secondBox.x + secondBox.width / 2,
      secondBox.y + secondBox.height / 2 + 20,
      { steps: 10 },
    )
    await page.mouse.up()
  }

  // Let dnd-kit's own drop/settle transition finish before reading the
  // DOM or clicking Save — reading/clicking mid-transition was
  // observed to be unreliable.
  await page.waitForTimeout(500)
  const namesAfterDrag = await categoryNamesInOrder(page)
  expect(namesAfterDrag).toEqual([namesBefore[1], namesBefore[0], ...namesBefore.slice(2)])

  await page.getByRole('button', { name: 'Save order' }).click()
  await page.waitForURL('**/school-admin/products', { timeout: 10000 })
  await prep(page)

  // Persistence check: reload the reorder screen fresh from the
  // server and confirm the swapped order survived the round trip —
  // not just that the in-memory drag state changed.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/school-admin/products/order')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.getByText('Menu display order').waitFor()
  await page.locator('[data-testid="category-name"]').first().waitFor()
  await prep(page)
  const namesAfterReload = await categoryNamesInOrder(page)
  expect(namesAfterReload).toEqual(namesAfterDrag)
})
