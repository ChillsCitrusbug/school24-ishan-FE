// FR-044 visual-regression (Step 17 / _visual-check.md).
//
// Real end-to-end run, two scenarios:
//
// 1. FR-020's own approval decision auto-delivers a real, system-
//    sourced notification to the parent (this ticket's own cross-role
//    gate) — real link request, real School Admin approval, real
//    inbox check as the same parent afterward.
// 2. FR-043's own manual compose flow shows a real "sending started"
//    confirmation (not the mock's own live delivered/failed counts),
//    and the targeted Staff recipient sees it in their own real inbox.

import { test, expect } from '@playwright/test'

test('sc-090/091 an approval decision auto-delivers a real notification to the parent inbox', async ({ page }) => {
  const studentId = process.env.FR044_STUDENT_ID ?? 'S-B30001'

  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR044_PARENT_EMAIL ?? 'batch3-parent@example.com')
  await page.getByLabel('Password').fill(process.env.FR044_PARENT_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/parent')
  await page.getByRole('link', { name: /add child/i }).click()
  await page.waitForURL('**/parent/children/add')
  await page.getByPlaceholder(/e\.g\. S-40231/i).fill(studentId)
  await page.getByRole('button', { name: /send link request/i }).click()
  await page.waitForLoadState('networkidle')

  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR044_SA_EMAIL ?? 'batch3-sa@example.com')
  await page.getByLabel('Password').fill(process.env.FR044_SA_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')
  await page.evaluate(() => {
    window.history.pushState({}, '', '/school-admin/approvals')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/school-admin/approvals')
  await page.waitForLoadState('networkidle')
  const targetRow = page.locator('div', { hasText: 'Batch3 Student' }).filter({
    has: page.getByRole('button', { name: /^approve$/i }),
  })
  await targetRow.getByRole('button', { name: /^approve$/i }).first().click()
  await page.waitForLoadState('networkidle')

  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR044_PARENT_EMAIL ?? 'batch3-parent@example.com')
  await page.getByLabel('Password').fill(process.env.FR044_PARENT_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/parent')

  await page.getByRole('button', { name: /notifications/i }).click()
  await page.waitForURL('**/parent/inbox')
  await page.waitForLoadState('networkidle')

  await expect(page.getByText('Your child link request was approved')).toBeVisible()
})

test('sc-088/090/091 a composed broadcast shows a real "sending started" confirmation and reaches the staff inbox', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR044_SA_EMAIL ?? 'batch3-sa@example.com')
  await page.getByLabel('Password').fill(process.env.FR044_SA_PASSWORD ?? 'VisualCheck123!')
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
  await expect(page.getByText(/\d+\s*(delivered|failed)/i)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /retry failed/i })).toHaveCount(0)
  await page.getByRole('button', { name: /^done$/i }).click()
  await page.waitForURL('**/school-admin')

  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR044_STAFF_EMAIL ?? 'batch3-staff@example.com')
  await page.getByLabel('Password').fill(process.env.FR044_STAFF_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/staff')

  await page.getByRole('button', { name: /notifications/i }).click()
  await page.waitForURL('**/staff/inbox')
  await page.waitForLoadState('networkidle')

  await expect(page.getByText(title)).toBeVisible()
})
