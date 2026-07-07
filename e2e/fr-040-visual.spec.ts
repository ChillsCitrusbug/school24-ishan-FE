// FR-040 visual-regression (Step 17 / _visual-check.md).
//
// No dedicated screen — per EXECUTION_ORDER.md this is a cross-cutting
// filter applied inside FR-041's own future tracking/history screens
// (Sc081/082/083), which don't exist yet in this batch. Same "real
// functional API-level run, no browser UI" style already used for
// FR-033's own visual check.
//
// Places TWO real orders for the same real linked child — one funded
// by the STUDENT's own wallet (via the Student's own checkout, FR-036)
// and one funded by the PARENT's own wallet (via the Parent's own
// checkout for the child, FR-037) — then confirms GET /api/v1/orders
// and GET /api/v1/orders/{id} enforce the funding-wallet visibility
// rule for real: the student sees only their own-wallet order, the
// parent sees both, and the student is 403'd from viewing the
// parent-wallet order even though it was placed for them.

import { test, expect, request as playwrightRequest } from '@playwright/test'

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8000'
const STUDENT_ID_CODE = process.env.FR040_STUDENT_ID ?? 'S-B30001'
const STUDENT_PASSWORD = process.env.FR040_STUDENT_PASSWORD ?? 'StudentVC123!'
const PARENT_EMAIL = process.env.FR040_PARENT_EMAIL ?? 'batch3-parent@example.com'
const PARENT_PASSWORD = process.env.FR040_PARENT_PASSWORD ?? 'VisualCheck123!'
const SA_EMAIL = process.env.FR040_SA_EMAIL ?? 'batch3-sa@example.com'
const SA_PASSWORD = process.env.FR040_SA_PASSWORD ?? 'VisualCheck123!'

async function login(api: Awaited<ReturnType<typeof playwrightRequest.newContext>>, email: string, password: string) {
  const res = await api.post('/api/v1/auth/login', { data: { email, password } })
  expect(res.ok()).toBeTruthy()
  return ((await res.json()).data.access_token) as string
}

async function studentLogin(api: Awaited<ReturnType<typeof playwrightRequest.newContext>>) {
  const res = await api.post('/api/v1/student-auth/login', {
    data: { student_id: STUDENT_ID_CODE, password: STUDENT_PASSWORD },
  })
  expect(res.ok()).toBeTruthy()
  return ((await res.json()).data.access_token) as string
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` }
}

test('fr-040 order visibility follows the funding wallet, not who placed it', async () => {
  const api = await playwrightRequest.newContext({ baseURL: API_BASE_URL })

  // Real link request + real Staff/SA approval.
  const parentToken = await login(api, PARENT_EMAIL, PARENT_PASSWORD)
  await api.post('/api/v1/parent/children', {
    headers: auth(parentToken),
    data: { student_id: STUDENT_ID_CODE },
  })
  const saToken = await login(api, SA_EMAIL, SA_PASSWORD)
  const pending = await api.get('/api/v1/approvals/parent-links', { headers: auth(saToken) })
  const pendingLinks = (await pending.json()).data as Array<{ id: string; student_name: string }>
  const target = pendingLinks.find((l) => l.student_name === 'Batch3 Student')
  expect(target).toBeTruthy()
  await api.patch(`/api/v1/approvals/parent-links/${target!.id}`, {
    headers: auth(saToken),
    data: { decision: 'approve' },
  })

  const children = await api.get('/api/v1/parent/children', { headers: auth(parentToken) })
  const childList = (await children.json()).data as Array<{
    student_id: string
    student_id_code: string
  }>
  const child = childList.find((c) => c.student_id_code === STUDENT_ID_CODE)
  expect(child).toBeTruthy()
  const studentPk = child!.student_id

  // Real menu item for the child.
  const menu = await api.get(`/api/v1/children/${studentPk}/menu/items`, {
    headers: auth(parentToken),
  })
  const menuItems = (await menu.json()).data as Array<{ id: string; item_type: string }>
  const appleSlices = menuItems.find((i) => i.item_type === 'product')
  expect(appleSlices).toBeTruthy()

  // 1) The STUDENT places a real order, funded by their OWN wallet.
  const studentToken = await studentLogin(api)
  await api.post(`/api/v1/students/${studentPk}/cart/items`, {
    headers: auth(studentToken),
    data: { item_type: 'product', product_id: appleSlices!.id, quantity: 1 },
  })
  const studentCheckout = await api.post(`/api/v1/students/${studentPk}/checkout`, {
    headers: auth(studentToken),
    data: { confirm_checkout: true },
  })
  expect(studentCheckout.ok()).toBeTruthy()
  const studentOrderId = (await studentCheckout.json()).data.id as string

  // 2) The PARENT places a real order for the SAME child, funded by
  //    the PARENT's OWN wallet (not the child's). Cart itself has no
  //    Parent-specific "child" wrapper endpoint (FR-037's own decision
  //    #4) — the shared `/students/{id}/cart/items` already accepts a
  //    Parent actor.
  await api.post(`/api/v1/students/${studentPk}/cart/items`, {
    headers: auth(parentToken),
    data: { item_type: 'product', product_id: appleSlices!.id, quantity: 1 },
  })
  const parentWalletId = (await api.get('/api/v1/wallet/parent/me', { headers: auth(parentToken) })
    .then((r) => r.json())).data.wallet_id as string
  const parentCheckout = await api.post(`/api/v1/children/${studentPk}/checkout`, {
    headers: auth(parentToken),
    data: { confirm_checkout: true, funding_wallet_id: parentWalletId },
  })
  expect(parentCheckout.ok()).toBeTruthy()
  const parentOrderId = (await parentCheckout.json()).data.id as string

  // The student sees ONLY their own-wallet order.
  const studentOrders = await api.get('/api/v1/orders', { headers: auth(studentToken) })
  const studentOrderIds = ((await studentOrders.json()).data as Array<{ id: string }>).map((o) => o.id)
  expect(studentOrderIds).toContain(studentOrderId)
  expect(studentOrderIds).not.toContain(parentOrderId)

  // The parent sees BOTH — their own-wallet order and the child's.
  const parentOrders = await api.get('/api/v1/orders', { headers: auth(parentToken) })
  const parentOrderIds = ((await parentOrders.json()).data as Array<{ id: string }>).map((o) => o.id)
  expect(parentOrderIds).toContain(studentOrderId)
  expect(parentOrderIds).toContain(parentOrderId)

  // The student is 403'd from viewing the parent-wallet order directly,
  // even though it was placed for them (EC-024/025).
  const studentViewsParentOrder = await api.get(`/api/v1/orders/${parentOrderId}`, {
    headers: auth(studentToken),
  })
  expect(studentViewsParentOrder.status()).toBe(403)

  // The parent CAN view the student's own-wallet order directly.
  const parentViewsStudentOrder = await api.get(`/api/v1/orders/${studentOrderId}`, {
    headers: auth(parentToken),
  })
  expect(parentViewsStudentOrder.ok()).toBeTruthy()

  await api.dispose()
})
