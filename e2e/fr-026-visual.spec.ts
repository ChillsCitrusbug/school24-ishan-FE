// FR-026 visual-regression (Step 17 / _visual-check.md).
//
// Real end-to-end run against the live local stack (this batch's own
// seeded fixtures, scripts/seed_batch3_fixtures.py + a product created
// directly for this spec): a real School Admin logs in, toggles a real
// product's availability off then back on, confirmed against the
// live backend (not mocked) — proves persistence across a reload, not
// just a client-side optimistic flip.

import { test, expect } from '@playwright/test'

test('sc-046 products list availability toggle, real round trip', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR026_SA_EMAIL ?? 'batch3-sa@example.com')
  await page.getByLabel('Password').fill(process.env.FR026_SA_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')

  await page.evaluate(() => {
    window.history.pushState({}, '', '/school-admin/products/new')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/school-admin/products/new')
  const productName = `FR026 Visual Check Product ${Date.now()}`
  await page.getByLabel('Product name').fill(productName)
  await page.getByLabel('Category').fill(`FR026 Visual Check Category ${Date.now()}`)
  await page.getByLabel('Base price').fill('4.50')
  await page.getByLabel('Variant name').first().fill('Regular')
  await page.getByLabel('Variant price').first().fill('4.50')
  await page.getByRole('button', { name: /save product/i }).click()
  await page.waitForURL('**/school-admin/products/*/edit')

  await page.evaluate(() => {
    window.history.pushState({}, '', '/school-admin/products')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/school-admin/products')
  await page.waitForLoadState('networkidle')

  const toggle = page.getByRole('switch', { name: new RegExp(`${productName} available`, 'i') })
  await expect(toggle).toHaveAttribute('aria-checked', 'true')

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByText('Updating…')).toHaveCount(0)

  // Not page.reload() — this app keeps its JWT in memory only (no
  // localStorage), so a real reload logs the user out (same class of
  // bug FR-012's own visual check found and worked around). Navigate
  // away and back via pushState instead, forcing the list screen to
  // remount and genuinely re-fetch from the live backend.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/school-admin')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/school-admin')
  await page.evaluate(() => {
    window.history.pushState({}, '', '/school-admin/products')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/school-admin/products')
  await page.waitForLoadState('networkidle')
  await expect(
    page.getByRole('switch', { name: new RegExp(`${productName} available`, 'i') }),
  ).toHaveAttribute('aria-checked', 'false')

  await page
    .getByRole('switch', { name: new RegExp(`${productName} available`, 'i') })
    .click()
  await expect(
    page.getByRole('switch', { name: new RegExp(`${productName} available`, 'i') }),
  ).toHaveAttribute('aria-checked', 'true')
})
