// FR-024 visual-regression (Step 17 / _visual-check.md).
//
// Sanity-only screenshots, not asserted against a design baseline —
// same precedent as every prior ticket. Image UPLOAD success is not
// exercised here — AWS_S3_*/MinIO credentials are left unpopulated in
// .env per this ticket's own field-reconciliation decision #2 (same
// "populate real credentials later" precedent as STRIPE_* for
// FR-028/030), so a real upload would fail against no real bucket.
// The dropzone UI itself, and its client-side validation (which never
// touches the backend), are still verified.
//
//   VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//     FR024_SA_EMAIL=<seeded> FR024_SA_PASSWORD=<seeded> \
//     npx playwright test fr-024-visual

import { test, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function prep(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}

async function loginAndNavigateTo(page: Page, path: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR024_SA_EMAIL ?? '')
  await page.getByLabel('Password').fill(process.env.FR024_SA_PASSWORD ?? '')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')

  await page.evaluate((target) => {
    window.history.pushState({}, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForFunction((target) => window.location.pathname === target, path)
}

test('sc-046 products list sanity screenshot', async ({ page }) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(page, '/school-admin/products')
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-024-visual.spec.ts-snapshots/sc-046-products-list-sanity.png',
  })
})

test('sc-047 create-product form, then actually creates one with 3 variants', async ({ page }) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(page, '/school-admin/products/new')
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-024-visual.spec.ts-snapshots/sc-047-add-product-form-sanity.png',
  })

  await page.getByPlaceholder('e.g. Chicken Wrap').fill('Chicken Wrap')
  await page.getByPlaceholder('e.g. Hot Food').fill(`Hot Food ${Date.now()}`)
  await page.getByLabel('Base price').fill('6.50')
  await page.getByLabel('Variant name').fill('Regular')
  await page.getByLabel('Variant price').fill('6.50')
  await page.getByRole('button', { name: '+ Add variant' }).click()
  const names = page.getByLabel('Variant name')
  const prices = page.getByLabel('Variant price')
  await names.nth(1).fill('Large')
  await prices.nth(1).fill('8.00')
  await page.getByRole('button', { name: 'Save product' }).click()
  await page.getByText('Edit product').waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-024-visual.spec.ts-snapshots/sc-047-edit-product-form-sanity.png',
  })
})

test('sc-047 image dropzone renders and rejects an invalid file client-side', async ({ page }) => {
  test.skip(SOURCE === 'design', 'design-only baseline capture not meaningful for this screen')
  await loginAndNavigateTo(page, '/school-admin/products/new')
  await prep(page)

  await page.getByPlaceholder('e.g. Chicken Wrap').fill('Sandwich')
  await page.getByPlaceholder('e.g. Hot Food').fill(`Cold Food ${Date.now()}`)
  await page.getByLabel('Base price').fill('5.00')
  await page.getByLabel('Variant name').fill('Regular')
  await page.getByLabel('Variant price').fill('5.00')
  await page.getByRole('button', { name: 'Save product' }).click()
  await page.getByText('Edit product').waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-024-visual.spec.ts-snapshots/sc-047-image-dropzone-sanity.png',
  })

  await page.setInputFiles('input[type="file"]', {
    name: 'not-an-image.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not an image'),
  })
  await page.getByText('Only PNG or JPG images are allowed.').waitFor()
  await prep(page)
  await page.screenshot({
    path: 'e2e/fr-024-visual.spec.ts-snapshots/sc-047-image-invalid-type-rejected-sanity.png',
  })
})
