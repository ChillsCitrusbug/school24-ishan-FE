// FR-045 visual-regression (Step 17 / _visual-check.md).
//
// Real end-to-end run: a real Student places a real order (funded by
// their own wallet), then a real School Admin views the real
// operational reports screen (`/school-admin/reports`) and confirms
// genuine order/revenue data renders, then navigates to the real
// product sales report (`/school-admin/reports/products`) and confirms
// "Apple Slices" appears in the ranked list — both cross-checked
// against real independent follow-up API calls to the same 2 report
// endpoints.

import { test, expect, request as playwrightRequest } from '@playwright/test'

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8000'
const STUDENT_ID_CODE = process.env.FR045_STUDENT_ID ?? 'S-B30001'
const STUDENT_PASSWORD = process.env.FR045_STUDENT_PASSWORD ?? 'StudentVC123!'
const SA_EMAIL = process.env.FR045_SA_EMAIL ?? 'batch3-sa@example.com'
const SA_PASSWORD = process.env.FR045_SA_PASSWORD ?? 'VisualCheck123!'

test('sc-086/sc-087 a real school admin sees real operational + product sales reports', async ({
  page,
}) => {
  // Place a real order as Student first.
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

  // Now view the real operational reports as School Admin.
  await page.goto('/login')
  await page.getByLabel('Email').fill(SA_EMAIL)
  await page.getByLabel('Password').fill(SA_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')
  await page.evaluate(() => {
    window.history.pushState({}, '', '/school-admin/reports')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/school-admin/reports')
  await page.waitForLoadState('networkidle')

  await expect(page.getByText('Operational reports')).toBeVisible()
  await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible()

  await page.getByRole('button', { name: /product sales/i }).click()
  await page.waitForFunction(() => window.location.pathname === '/school-admin/reports/products')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('Apple Slices')).toBeVisible()

  // Real follow-up: independent API calls to the same 2 report
  // endpoints, confirming the screens' own data is genuinely live.
  const api = await playwrightRequest.newContext({ baseURL: API_BASE_URL })
  const login = await api.post('/api/v1/auth/login', {
    data: { email: SA_EMAIL, password: SA_PASSWORD },
  })
  const token = (await login.json()).data.access_token as string
  const schoolId = (await login.json()).data.user.school_id as string
  const auth = { Authorization: `Bearer ${token}` }

  const revenue = await api.get(`/api/v1/schools/${schoolId}/reports/revenue-summary`, {
    headers: auth,
  })
  const revenueData = (await revenue.json()).data as { order_count: number }
  expect(revenueData.order_count).toBeGreaterThan(0)

  const sales = await api.get(`/api/v1/schools/${schoolId}/reports/product-sales`, {
    headers: auth,
  })
  const salesData = (await sales.json()).data as { name: string }[]
  expect(salesData.some((row) => row.name === 'Apple Slices')).toBe(true)

  await api.dispose()
})
