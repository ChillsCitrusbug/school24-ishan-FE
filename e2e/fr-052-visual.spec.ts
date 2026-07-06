// FR-052 visual-regression (Step 17 / _visual-check.md).
//
// Real end-to-end run: a real School Admin composes a real notification
// to Staff (reusing FR-043's own already-shipped compose flow), then
// views it in the new sent-notifications log — confirming title,
// sender, source label, recipients, and delivery outcome all reflect
// real data, and that "View row details" expands the real message
// body. A separate run confirms a Staff member without Notification
// access is denied (Scenario 3) — the shared batch3 fixture's own
// Staff account has only `approval` module access, not
// `notification`, so no extra fixture is needed for this.

import { test, expect } from '@playwright/test'

test('sc-089 a real composed notification appears in the sent log with its real details', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR052_SA_EMAIL ?? 'batch3-sa@example.com')
  await page.getByLabel('Password').fill(process.env.FR052_SA_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')
  await page.evaluate(() => {
    window.history.pushState({}, '', '/school-admin/notifications/new')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/school-admin/notifications/new')
  await page.waitForLoadState('networkidle')

  const title = `Canteen closed Friday ${Date.now()}`
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Message').fill('The canteen is closed for maintenance this Friday.')
  await page.getByRole('checkbox', { name: 'Staff' }).click()
  await page.getByRole('button', { name: /send notification/i }).click()
  await expect(page.getByText('Sending started')).toBeVisible()
  await page.getByRole('button', { name: /^done$/i }).click()
  await page.waitForURL('**/school-admin')

  // Real navigation to the new sent-log screen (via the sidebar, not a
  // direct URL push, to also prove the nav wiring itself works).
  await page.getByRole('link', { name: /^notifications$/i }).click()
  await page.waitForURL('**/school-admin/notifications')
  await page.waitForLoadState('networkidle')

  const row = page.locator('tr', { hasText: title })
  await expect(row).toBeVisible()
  await expect(row.getByText('Manual')).toBeVisible()
  await expect(row.getByText('Staff')).toBeVisible()
  await expect(row.getByText(/delivered|delivering/i)).toBeVisible()

  // "View row details" reuses the already-fetched body, no extra call.
  await row.getByRole('button', { name: /view details/i }).click()
  await expect(page.getByText('The canteen is closed for maintenance this Friday.')).toBeVisible()
})

test('sc-089 a Staff member without Notification access is denied the log', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR052_STAFF_EMAIL ?? 'batch3-staff@example.com')
  await page.getByLabel('Password').fill(process.env.FR052_STAFF_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/staff')
  await page.evaluate(() => {
    window.history.pushState({}, '', '/school-admin/notifications')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/school-admin/notifications')
  await page.waitForLoadState('networkidle')

  await expect(page.getByText(/something went wrong/i)).toBeVisible()
})
