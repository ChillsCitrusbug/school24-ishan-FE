// FR-033 visual-regression (Step 17 / _visual-check.md).
//
// Field-reconciliation decision #4: this ticket ships NO frontend
// (ticket-QA Finding #10 — `POST .../cart/items` is a minimal,
// enforcement-only stub; the real cart-building UX is FR-035's own
// job, extending this SAME endpoint rather than replacing it). There
// is no screen to click through yet, so this is a real functional
// end-to-end run against the two new API endpoints directly (real
// running backend, real Postgres, real JWTs) rather than a browser
// UI walkthrough — the same "real flow, no screenshot diff" style
// already used for every prior backend-heavy ticket in this batch.
//
// Reuses the shared batch3 fixture (`scripts/seed_batch3_fixtures.py`)
// for its school/parent/student/product, same as FR-019 through
// FR-044.

import { test, expect, request as playwrightRequest } from '@playwright/test'

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8000'
const STUDENT_ID_CODE = process.env.FR033_STUDENT_ID ?? 'S-B30001'
const PARENT_EMAIL = process.env.FR033_PARENT_EMAIL ?? 'batch3-parent@example.com'
const PARENT_PASSWORD = process.env.FR033_PARENT_PASSWORD ?? 'VisualCheck123!'
const SA_EMAIL = process.env.FR033_SA_EMAIL ?? 'batch3-sa@example.com'
const SA_PASSWORD = process.env.FR033_SA_PASSWORD ?? 'VisualCheck123!'
const STAFF_EMAIL = process.env.FR033_STAFF_EMAIL ?? 'batch3-staff@example.com'
const STAFF_PASSWORD = process.env.FR033_STAFF_PASSWORD ?? 'VisualCheck123!'
const STUDENT_PASSWORD = process.env.FR033_STUDENT_PASSWORD ?? 'StudentVC123!'

async function login(email: string, password: string) {
  const api = await playwrightRequest.newContext({ baseURL: API_BASE_URL })
  const res = await api.post('/api/v1/auth/login', { data: { email, password } })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  await api.dispose()
  return body.data.access_token as string
}

async function studentLogin(studentIdCode: string, password: string) {
  const api = await playwrightRequest.newContext({ baseURL: API_BASE_URL })
  const res = await api.post('/api/v1/student-auth/login', {
    data: { student_id: studentIdCode, password },
  })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  await api.dispose()
  return body.data.access_token as string
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` }
}

test('fr-033 a real blocked product is rejected identically by check and cart/items, an allowed one is persisted', async () => {
  const api = await playwrightRequest.newContext({ baseURL: API_BASE_URL })

  // Real link request + real Staff approval (same flow as FR-019/020's
  // own visual checks) — establishes a genuine APPROVED link.
  const parentToken = await login(PARENT_EMAIL, PARENT_PASSWORD)
  await api.post('/api/v1/parent/children', {
    headers: auth(parentToken),
    data: { student_id: STUDENT_ID_CODE },
  })

  const staffToken = await login(STAFF_EMAIL, STAFF_PASSWORD)
  const pending = await api.get('/api/v1/approvals/parent-links', { headers: auth(staffToken) })
  const pendingLinks = (await pending.json()).data as Array<{
    id: string
    student_name: string
  }>
  const target = pendingLinks.find((l) => l.student_name === 'Batch3 Student')
  expect(target).toBeTruthy()
  const decide = await api.patch(`/api/v1/approvals/parent-links/${target!.id}`, {
    headers: auth(staffToken),
    data: { decision: 'approve' },
  })
  expect(decide.ok()).toBeTruthy()

  // Resolve the real student UUID + a real, blockable catalog product.
  const children = await api.get('/api/v1/parent/children', { headers: auth(parentToken) })
  const childList = (await children.json()).data as Array<{
    student_id: string
    student_id_code: string
  }>
  const child = childList.find((c) => c.student_id_code === STUDENT_ID_CODE)
  expect(child).toBeTruthy()
  const studentPk = child!.student_id

  const catalog = await api.get(
    `/api/v1/students/${studentPk}/food-restrictions/catalog?q=choc`,
    { headers: auth(parentToken) },
  )
  const catalogItems = (await catalog.json()).data as Array<{ id: string; type: string }>
  const product = catalogItems.find((c) => c.type === 'product')
  expect(product).toBeTruthy()
  const productId = product!.id

  // Block it for real.
  const blockResponse = await api.post(`/api/v1/students/${studentPk}/food-restrictions`, {
    headers: auth(parentToken),
    data: { restriction_type: 'product', product_id: productId },
  })
  expect(blockResponse.ok()).toBeTruthy()

  // GET check and POST cart/items must agree — the ticket's own
  // "enforce the rule identically" DoD, proven against the real stack.
  const checkBlocked = await api.get(
    `/api/v1/students/${studentPk}/food-restrictions/check?product_id=${productId}`,
    { headers: auth(parentToken) },
  )
  expect(checkBlocked.ok()).toBeTruthy()
  expect((await checkBlocked.json()).data.blocked).toBe(true)

  const cartBlocked = await api.post(`/api/v1/students/${studentPk}/cart/items`, {
    headers: auth(parentToken),
    data: { item_type: 'product', product_id: productId, quantity: 1 },
  })
  expect(cartBlocked.status()).toBe(403)

  // The student themself is blocked identically (Scenario 3 — applies
  // regardless of who is ordering).
  const studentToken = await studentLogin(STUDENT_ID_CODE, STUDENT_PASSWORD)
  const studentCartBlocked = await api.post(`/api/v1/students/${studentPk}/cart/items`, {
    headers: auth(studentToken),
    data: { item_type: 'product', product_id: productId, quantity: 1 },
  })
  expect(studentCartBlocked.status()).toBe(403)

  // No override for the School Admin either — EC-015.
  const saToken = await login(SA_EMAIL, SA_PASSWORD)
  const saCartAttempt = await api.post(`/api/v1/students/${studentPk}/cart/items`, {
    headers: auth(saToken),
    data: { item_type: 'product', product_id: productId, quantity: 1 },
  })
  expect(saCartAttempt.status()).toBe(403)

  // A genuinely unblocked item ("Apple Slices", seeded specifically for
  // this ticket's own visual check, never blocked in this run) is
  // allowed by both endpoints and really persists as a cart-item row.
  const allowedSearch = await api.get(
    `/api/v1/students/${studentPk}/food-restrictions/catalog?q=apple`,
    { headers: auth(parentToken) },
  )
  const allowedCatalogItems = (await allowedSearch.json()).data as Array<{
    id: string
    type: string
  }>
  const allowedProduct = allowedCatalogItems.find((c) => c.type === 'product')
  expect(allowedProduct).toBeTruthy()
  const allowedProductId = allowedProduct!.id

  const checkAllowed = await api.get(
    `/api/v1/students/${studentPk}/food-restrictions/check?product_id=${allowedProductId}`,
    { headers: auth(parentToken) },
  )
  expect(checkAllowed.ok()).toBeTruthy()
  expect((await checkAllowed.json()).data.blocked).toBe(false)

  const cartAllowed = await api.post(`/api/v1/students/${studentPk}/cart/items`, {
    headers: auth(parentToken),
    data: { item_type: 'product', product_id: allowedProductId, quantity: 2 },
  })
  expect(cartAllowed.status()).toBe(201)
  const cartItemBody = (await cartAllowed.json()).data
  expect(cartItemBody.product_id).toBe(allowedProductId)
  expect(cartItemBody.quantity).toBe(2)

  await api.dispose()
})
