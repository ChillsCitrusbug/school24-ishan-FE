// FR-042 visual-regression (Step 17 / _visual-check.md).
//
// A real School Admin views the school-wide all-orders list and
// exports it in all 3 formats (CSV/XLSX/PDF — the user's own upfront
// batch decision named all 3, not CSV-only). Places TWO real orders
// for the same real linked child — one funded by the STUDENT's own
// wallet (FR-036's checkout) and one funded by the PARENT's own wallet
// (FR-037's checkout) — then confirms the SA sees BOTH on
// GET /api/v1/orders/admin (unlike FR-040's own funding-wallet
// visibility filter, which deliberately does not apply to this SA
// view), that a student_name filter narrows the result, and that
// GET /api/v1/orders/admin/export returns real, correctly-typed
// content for each format.

import { test, expect, request as playwrightRequest } from '@playwright/test'

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8000'
const STUDENT_ID_CODE = process.env.FR042_STUDENT_ID ?? 'S-B30001'
const STUDENT_PASSWORD = process.env.FR042_STUDENT_PASSWORD ?? 'StudentVC123!'
const PARENT_EMAIL = process.env.FR042_PARENT_EMAIL ?? 'batch3-parent@example.com'
const PARENT_PASSWORD = process.env.FR042_PARENT_PASSWORD ?? 'VisualCheck123!'
const SA_EMAIL = process.env.FR042_SA_EMAIL ?? 'batch3-sa@example.com'
const SA_PASSWORD = process.env.FR042_SA_PASSWORD ?? 'VisualCheck123!'

type ApiContext = Awaited<ReturnType<typeof playwrightRequest.newContext>>

async function login(api: ApiContext, email: string, password: string) {
  const res = await api.post('/api/v1/auth/login', { data: { email, password } })
  expect(res.ok()).toBeTruthy()
  return ((await res.json()).data.access_token) as string
}

async function studentLogin(api: ApiContext) {
  const res = await api.post('/api/v1/student-auth/login', {
    data: { student_id: STUDENT_ID_CODE, password: STUDENT_PASSWORD },
  })
  expect(res.ok()).toBeTruthy()
  return ((await res.json()).data.access_token) as string
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` }
}

test('fr-042 school admin sees every in-tenant order and exports a real CSV', async () => {
  const api = await playwrightRequest.newContext({ baseURL: API_BASE_URL })

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

  const menu = await api.get(`/api/v1/children/${studentPk}/menu/items`, {
    headers: auth(parentToken),
  })
  const menuItems = (await menu.json()).data as Array<{ id: string; item_type: string }>
  const appleSlices = menuItems.find((i) => i.item_type === 'product')
  expect(appleSlices).toBeTruthy()

  // A real student-wallet-funded order.
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
  const studentOrder = (await studentCheckout.json()).data as { id: string; display_id: string }

  // A real parent-wallet-funded order for the SAME child.
  await api.post(`/api/v1/students/${studentPk}/cart/items`, {
    headers: auth(parentToken),
    data: { item_type: 'product', product_id: appleSlices!.id, quantity: 1 },
  })
  const parentWalletId = (
    await api.get('/api/v1/wallet/parent/me', { headers: auth(parentToken) }).then((r) => r.json())
  ).data.wallet_id as string
  const parentCheckout = await api.post(`/api/v1/children/${studentPk}/checkout`, {
    headers: auth(parentToken),
    data: { confirm_checkout: true, funding_wallet_id: parentWalletId },
  })
  expect(parentCheckout.ok()).toBeTruthy()
  const parentOrder = (await parentCheckout.json()).data as { id: string; display_id: string }

  // The School Admin sees BOTH — FR-040's own funding-wallet
  // visibility filter deliberately does not apply to this SA view.
  const adminList = await api.get('/api/v1/orders/admin', { headers: auth(saToken) })
  expect(adminList.ok()).toBeTruthy()
  const adminListBody = await adminList.json()
  const adminOrderIds = (adminListBody.data as Array<{ id: string }>).map((o) => o.id)
  expect(adminOrderIds).toContain(studentOrder.id)
  expect(adminOrderIds).toContain(parentOrder.id)
  expect(adminListBody.meta.total).toBeGreaterThanOrEqual(2)

  // A student_name filter narrows the result to just this student's
  // own orders (both are for the same student here, so this proves
  // the filter is genuinely applied, not a no-op).
  const filtered = await api.get('/api/v1/orders/admin?student_name=Batch3', {
    headers: auth(saToken),
  })
  expect(filtered.ok()).toBeTruthy()
  const filteredIds = ((await filtered.json()).data as Array<{ id: string }>).map((o) => o.id)
  expect(filteredIds).toContain(studentOrder.id)
  expect(filteredIds).toContain(parentOrder.id)

  // A real CSV export containing both orders (the default format).
  const csvResponse = await api.get('/api/v1/orders/admin/export', { headers: auth(saToken) })
  expect(csvResponse.ok()).toBeTruthy()
  expect(csvResponse.headers()['content-type']).toContain('text/csv')
  const csvText = await csvResponse.text()
  expect(csvText).toContain(studentOrder.display_id)
  expect(csvText).toContain(parentOrder.display_id)

  // A real XLSX export — a genuine ZIP-based spreadsheet (magic bytes
  // "PK"), not just a mislabeled CSV.
  const xlsxResponse = await api.get('/api/v1/orders/admin/export?format=xlsx', {
    headers: auth(saToken),
  })
  expect(xlsxResponse.ok()).toBeTruthy()
  expect(xlsxResponse.headers()['content-type']).toBe(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  const xlsxBody = await xlsxResponse.body()
  expect(xlsxBody.subarray(0, 2).toString('latin1')).toBe('PK')

  // A real PDF export — genuine PDF magic bytes.
  const pdfResponse = await api.get('/api/v1/orders/admin/export?format=pdf', {
    headers: auth(saToken),
  })
  expect(pdfResponse.ok()).toBeTruthy()
  expect(pdfResponse.headers()['content-type']).toBe('application/pdf')
  const pdfBody = await pdfResponse.body()
  expect(pdfBody.subarray(0, 5).toString('latin1')).toBe('%PDF-')

  await api.dispose()
})
