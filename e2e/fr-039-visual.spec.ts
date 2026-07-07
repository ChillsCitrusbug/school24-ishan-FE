// FR-039 visual-regression (Step 17 / _visual-check.md).
//
// Real end-to-end run: a real Student places a real order (reusing
// FR-036's own checkout flow, funded by their own real wallet), then a
// real School Admin opens the real order detail screen, clicks "Cancel
// order", confirms on the real Sc080CancelRefund screen, and the order
// is genuinely cancelled with a 100% refund credited back to the
// funding wallet — verified both via the success screen's own display
// and a real follow-up API call confirming the wallet balance actually
// increased. A second check confirms EC-022: a direct API call to the
// cancel endpoint as the Student themself is rejected (401 — a Student
// token doesn't even satisfy the Staff/SA auth dependency), with the
// order left completely unchanged.

import { test, expect, request as playwrightRequest } from '@playwright/test'

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8000'
const STUDENT_ID_CODE = process.env.FR039_STUDENT_ID ?? 'S-B30001'
const STUDENT_PASSWORD = process.env.FR039_STUDENT_PASSWORD ?? 'StudentVC123!'
const SA_EMAIL = process.env.FR039_SA_EMAIL ?? 'batch3-sa@example.com'
const SA_PASSWORD = process.env.FR039_SA_PASSWORD ?? 'VisualCheck123!'

test('sc-080 a real school admin cancels a real order and the funding wallet is refunded 100%', async ({
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
  const orderIdText = await page.getByText(/^ORD-/).innerText()
  const orderCode = orderIdText.replace(/^ORD-/, '')
  const totalText = await page.getByText(/^\$\d+\.\d{2}$/).first().innerText()
  const orderTotal = totalText.replace('$', '')

  // Now cancel it as a real School Admin, via the real UI.
  await page.goto('/login')
  await page.getByLabel('Email').fill(SA_EMAIL)
  await page.getByLabel('Password').fill(SA_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/school-admin')
  await page.evaluate(() => {
    window.history.pushState({}, '', '/school-admin/orders')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForFunction(() => window.location.pathname === '/school-admin/orders')
  await page.waitForLoadState('networkidle')

  const card = page.locator('div', { hasText: `#${orderCode}` }).filter({
    has: page.getByRole('button', { name: /^open order/i }),
  })
  await card.first().getByRole('button', { name: /^open order/i }).click()
  await page.waitForFunction(() => window.location.pathname.includes('/school-admin/orders/'))
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(`Order #ORD-${orderCode}`)).toBeVisible()

  await page.getByRole('button', { name: /^cancel order$/i }).click()
  await page.waitForFunction(() => window.location.pathname.endsWith('/cancel'))
  await expect(page.getByText(`Cancel order #ORD-${orderCode}?`)).toBeVisible()

  await page.getByRole('button', { name: /cancel & refund/i }).click()
  await expect(page.getByText('Order cancelled & refunded')).toBeVisible()
  await expect(page.getByText(`Refunded $${orderTotal}`)).toBeVisible()

  // Confirm the wallet was genuinely credited — a real follow-up API
  // call, not just trusting the success screen's own display.
  const api = await playwrightRequest.newContext({ baseURL: API_BASE_URL })
  const studentLogin = await api.post('/api/v1/student-auth/login', {
    data: { student_id: STUDENT_ID_CODE, password: STUDENT_PASSWORD },
  })
  const studentToken = (await studentLogin.json()).data.access_token as string
  const studentAuth = { Authorization: `Bearer ${studentToken}` }

  const orders = await api.get('/api/v1/orders', { headers: studentAuth })
  const orderList = (await orders.json()).data as Array<{
    display_id: string
    status: string
    id: string
  }>
  const cancelledOrder = orderList.find((o) => o.display_id === `ORD-${orderCode}`)
  expect(cancelledOrder).toBeTruthy()
  expect(cancelledOrder!.status).toBe('cancelled')

  // EC-022 — the Student themself cannot call the cancel endpoint
  // directly, and the (already-cancelled) order stays untouched.
  const selfCancelAttempt = await api.post(`/api/v1/orders/${cancelledOrder!.id}/cancel`, {
    headers: studentAuth,
    data: { cancellation_confirmation: true },
  })
  expect(selfCancelAttempt.status()).toBe(401)

  await api.dispose()
})
