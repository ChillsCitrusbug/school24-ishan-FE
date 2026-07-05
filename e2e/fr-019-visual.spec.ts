// FR-019 visual-regression (Step 17 / _visual-check.md).
//
// Real end-to-end run against the live local stack (this batch's own
// seeded fixtures, scripts/seed_batch3_fixtures.py): a real Parent logs
// in, submits a real link request for the seeded Student, and the
// resulting pending row is confirmed via a real re-login as the seeded
// School Admin's own eventual Approval Queue (FR-020, not built yet in
// this same run — so this spec only confirms the Parent-facing
// request+success flow for now).

import { test, expect } from '@playwright/test'

test('sc-059 add-a-child real link request against the live backend', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.FR019_PARENT_EMAIL ?? 'batch3-parent@example.com')
  await page.getByLabel('Password').fill(process.env.FR019_PARENT_PASSWORD ?? 'VisualCheck123!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/parent')

  await page.getByRole('link', { name: /add child/i }).click()
  await page.waitForURL('**/parent/children/add')
  await page.waitForLoadState('networkidle')
  await page.screenshot({
    path: 'e2e/fr-019-visual.spec.ts-snapshots/sc-059-add-child-default-sanity.png',
    fullPage: true,
  })

  const studentId = process.env.FR019_STUDENT_ID ?? 'S-B30001'
  await page.getByPlaceholder(/e\.g\. S-40231/i).fill(studentId)
  await page.getByRole('button', { name: /send link request/i }).click()

  await expect(page.getByText('Request sent')).toBeVisible()
  await expect(page.getByText(new RegExp(studentId))).toBeVisible()
  await expect(page.getByText('Pending school approval')).toBeVisible()
  await page.screenshot({
    path: 'e2e/fr-019-visual.spec.ts-snapshots/sc-059-add-child-success-sanity.png',
    fullPage: true,
  })

  // Real proof this actually persisted server-side, not just a
  // client-side optimistic render: submitting the SAME student ID again
  // (this app keeps its JWT in-memory only, no localStorage — so this
  // goes through the real UI, same authenticated session) must now be
  // rejected as a duplicate, since the first request really landed.
  await page.getByRole('button', { name: /back to my children/i }).click()
  await page.waitForURL('**/parent')
  await page.getByRole('link', { name: /add child/i }).click()
  await page.waitForURL('**/parent/children/add')
  await page.getByPlaceholder(/e\.g\. S-40231/i).fill(studentId)
  await page.getByRole('button', { name: /send link request/i }).click()

  await expect(
    page.getByText(/already have a request or an active link for this student/i),
  ).toBeVisible()
})
