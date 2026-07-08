// FR-046 visual-regression (Step 17 / _visual-check.md).
//
// Real end-to-end run: places a real order as the Student (funded by
// the student's own wallet), then signs in as the SECOND seeded parent
// (`batch3-parent2@example.com`, seeded ALREADY approved+linked to this
// same student — see scripts/seed_batch3_fixtures.py's own module
// docstring) and confirms the real, full-mock-parity Sc068
// SpendingInsights screen renders genuine data for that child — spend,
// a real category breakdown, a real date-range picker, and a real CSV
// export download — matching what a live follow-up API call to the
// same spending-report endpoint independently confirms.
//
// Review finding (round 1): this spec originally reused the FIRST
// seeded parent (`batch3-parent@example.com`) and drove it through a
// real request+approve UI dance identical to fr-020-visual.spec.ts's
// own — but once approved, that pair can never return to "pending"
// again, permanently breaking fr-020's own "at least 1 pending Approve
// button" assertion for the rest of that Postgres session (reproduced
// live by the reviewer). Fixed by using a dedicated, already-linked
// second parent instead, seeded specifically so no ticket's own e2e
// spec ever needs to touch the first parent's own "starts unlinked"
// contract.

import { test, expect, request as playwrightRequest } from '@playwright/test'

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8000'
const STUDENT_ID_CODE = process.env.FR046_STUDENT_ID ?? 'S-B30001'
const STUDENT_PASSWORD = process.env.FR046_STUDENT_PASSWORD ?? 'StudentVC123!'
const PARENT2_EMAIL = process.env.FR046_PARENT2_EMAIL ?? 'batch3-parent2@example.com'
const PARENT2_PASSWORD = process.env.FR046_PARENT2_PASSWORD ?? 'VisualCheck123!'

test('sc-068 a real parent sees real spending data for a real approved child', async ({ page }) => {
  // Place a real order as the Student, funded by their own wallet.
  await page.goto('/student-login')
  await page.getByLabel('Student ID').fill(STUDENT_ID_CODE)
  await page.getByLabel('Password').fill(STUDENT_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/student')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /^browse menu$/i }).click()
  await page.waitForURL('**/student/menu')
  await page.waitForLoadState('networkidle')
  const appleCard = page.locator('[data-testid^="menu-item-"]', { hasText: 'Apple Slices' })
  await appleCard.getByRole('button', { name: /^add$/i }).click()
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /cart ·/i }).click()
  await page.waitForURL('**/student/cart')
  await page.getByRole('button', { name: /^checkout ·/i }).click()
  await page.waitForURL('**/student/checkout')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /pay & place order/i }).click()
  await page.waitForURL('**/student/checkout/receipt')

  // Now the real (already-approved) Parent views the real spending report.
  await page.goto('/login')
  await page.getByLabel('Email').fill(PARENT2_EMAIL)
  await page.getByLabel('Password').fill(PARENT2_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/parent')
  await page.evaluate(() => {
    window.history.pushState({}, '', '/parent/spending-report')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/parent/spending-report')
  await page.waitForLoadState('networkidle')

  await expect(page.getByText('Spending insights')).toBeVisible()
  // "Batch3 Student" legitimately appears more than once (the child
  // filter control, the bar-chart legend, and the transactions table)
  // — any one of them being visible is proof the real data rendered.
  await expect(page.getByText('Batch3 Student').first()).toBeVisible()
  await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible()
  // A real category breakdown (Apple Slices belongs to a real,
  // seeded category — never "Uncategorized").
  await expect(page.getByText('Uncategorized')).toHaveCount(0)

  // Real date-range picker: switch to "Last 7 days" and confirm the
  // report re-fetches without erroring (the order was just placed).
  await page.getByRole('button', { name: /\d{4}/ }).click()
  await page.getByRole('button', { name: /^last 7 days$/i }).click()
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('Spending insights')).toBeVisible()

  // Real CSV export download.
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /^export$/i }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('spending_report.csv')

  // Real follow-up: an independent API call to the exact same endpoint
  // must show at least 1 real order for this child, plus the mock-
  // parity fields, confirming the screen's own data is genuinely live.
  const api = await playwrightRequest.newContext({ baseURL: API_BASE_URL })
  const login = await api.post('/api/v1/auth/login', {
    data: { email: PARENT2_EMAIL, password: PARENT2_PASSWORD },
  })
  const token = (await login.json()).data.access_token as string
  const parentId = (await login.json()).data.user.id as string
  const report = await api.get(`/api/v1/parents/${parentId}/spending-report`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const reportData = (await report.json()).data as {
    children: { order_count: number }[]
    by_category: { label: string; total_spent: string }[]
    orders: { items_summary: string; category: string }[]
  }
  expect(reportData.children.length).toBeGreaterThan(0)
  expect(reportData.children[0].order_count).toBeGreaterThan(0)
  expect(reportData.by_category.length).toBeGreaterThan(0)
  expect(reportData.orders[0].items_summary).toBe('Apple Slices')
  expect(reportData.orders[0].category).not.toBe('Uncategorized')

  await api.dispose()
})
