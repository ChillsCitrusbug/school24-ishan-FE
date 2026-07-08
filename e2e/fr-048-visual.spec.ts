// FR-048 visual-regression (Step 17 / _visual-check.md). Same two-pass
// pattern as every prior ticket this session — real seeded accounts,
// credentials passed via env vars (matches FR-006/FR-018's own
// precedent), never hardcoded. Only the `default` and `change password`
// states are checked — the design catalog registers no third "edit"
// state for any of these 5 screens (edit mode isn't drawn as a distinct
// catalog entry, only change-password is).
//
// App-mode navigation uses the same history.pushState + popstate
// technique as fr-006-visual.spec.ts's own `loginAndNavigateTo` — a
// plain `page.goto(path)` after login is a real browser navigation,
// which destroys the in-memory-only access token (never persisted to
// localStorage, per agents/frontend.md) and silently redirects back to
// /login instead of reaching the target screen.
//
//   1. Capture baselines from the approved design catalog:
//      VISUAL_SOURCE=design PLAYWRIGHT_BASE_URL=http://localhost:5174 \
//        npx playwright test fr-048-visual --update-snapshots
//
//   2. Compare this build against those baselines (real seeded accounts
//      required — see docs/gates/FR-048.md for the exact seed used):
//      VISUAL_SOURCE=app PLAYWRIGHT_BASE_URL=http://localhost:5173 \
//        FR048_PA_EMAIL=<seeded> FR048_PA_PASSWORD=<seeded> \
//        FR048_SA_EMAIL=<seeded> FR048_SA_PASSWORD=<seeded> \
//        FR048_STAFF_EMAIL=<seeded> FR048_STAFF_PASSWORD=<seeded> \
//        FR048_PARENT_EMAIL=<seeded> FR048_PARENT_PASSWORD=<seeded> \
//        FR048_STUDENT_ID=<seeded> FR048_STUDENT_PASSWORD=<seeded> \
//        npx playwright test fr-048-visual

import { test, expect, type Page } from '@playwright/test'

const SOURCE = process.env.VISUAL_SOURCE === 'app' ? 'app' : 'design'

async function prep(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}

async function hideFixedElements(page: Page): Promise<void> {
  await page.addStyleTag({ content: '.fixed.bottom-4 { display: none !important; }' })
}

async function clientSideNavigate(page: Page, path: string): Promise<void> {
  await page.evaluate((target) => {
    window.history.pushState({}, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForFunction((target) => window.location.pathname === target, path)
}

async function loginAndNavigateTo(
  page: Page,
  email: string,
  password: string,
  landingUrlPattern: string,
  path: string,
): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(landingUrlPattern)
  await clientSideNavigate(page, path)
}

async function studentLoginAndNavigateTo(
  page: Page,
  studentId: string,
  password: string,
  path: string,
): Promise<void> {
  await page.goto('/student-login')
  await page.getByLabel('Student ID').fill(studentId)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/student')
  await clientSideNavigate(page, path)
}

interface RoleFixture {
  name: string
  designId: string
  designChangePwId: string
  emailEnv: string
  passwordEnv: string
  landingUrlPattern: string
  appProfilePath: string
}

const ROLES: RoleFixture[] = [
  {
    name: 'sc-022-pa',
    designId: 'sc-022',
    designChangePwId: 'sc-022-changepw',
    emailEnv: 'FR048_PA_EMAIL',
    passwordEnv: 'FR048_PA_PASSWORD',
    landingUrlPattern: '**/platform-admin',
    appProfilePath: '/platform-admin/profile',
  },
  {
    name: 'sc-097-sa',
    designId: 'sc-097',
    designChangePwId: 'sc-097-changepw',
    emailEnv: 'FR048_SA_EMAIL',
    passwordEnv: 'FR048_SA_PASSWORD',
    landingUrlPattern: '**/school-admin',
    appProfilePath: '/school-admin/profile',
  },
  {
    name: 'sc-042-staff',
    designId: 'sc-042',
    designChangePwId: 'sc-042-changepw',
    emailEnv: 'FR048_STAFF_EMAIL',
    passwordEnv: 'FR048_STAFF_PASSWORD',
    landingUrlPattern: '**/staff',
    appProfilePath: '/staff/profile',
  },
  {
    name: 'sc-069-parent',
    designId: 'sc-069',
    designChangePwId: 'sc-069-changepw',
    emailEnv: 'FR048_PARENT_EMAIL',
    passwordEnv: 'FR048_PARENT_PASSWORD',
    landingUrlPattern: '**/parent',
    appProfilePath: '/parent/profile',
  },
]

for (const role of ROLES) {
  test(`${role.name} (default) matches the approved design`, async ({ page }) => {
    if (SOURCE === 'design') {
      await page.goto(`#/${role.designId}`)
      await hideFixedElements(page)
    } else {
      await loginAndNavigateTo(
        page,
        process.env[role.emailEnv] ?? '',
        process.env[role.passwordEnv] ?? '',
        role.landingUrlPattern,
        role.appProfilePath,
      )
    }
    await prep(page)

    await expect(page).toHaveScreenshot(`${role.name}.png`, {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    })
  })

  test(`${role.name}-changepw matches the approved design`, async ({ page }) => {
    if (SOURCE === 'design') {
      await page.goto(`#/${role.designChangePwId}`)
      await hideFixedElements(page)
    } else {
      await loginAndNavigateTo(
        page,
        process.env[role.emailEnv] ?? '',
        process.env[role.passwordEnv] ?? '',
        role.landingUrlPattern,
        role.appProfilePath,
      )
      await page.getByRole('button', { name: /^change$/i }).click()
    }
    await prep(page)

    await expect(page).toHaveScreenshot(`${role.name}-changepw.png`, {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    })
  })
}

test('sc-098-student (default) matches the approved design', async ({ page }) => {
  if (SOURCE === 'design') {
    await page.goto('#/sc-098')
    await hideFixedElements(page)
  } else {
    await studentLoginAndNavigateTo(
      page,
      process.env.FR048_STUDENT_ID ?? '',
      process.env.FR048_STUDENT_PASSWORD ?? '',
      '/student/profile',
    )
  }
  await prep(page)

  await expect(page).toHaveScreenshot('sc-098-student.png', {
    maxDiffPixelRatio: 0.02,
    animations: 'disabled',
  })
})

test('sc-098-student-changepw matches the approved design', async ({ page }) => {
  if (SOURCE === 'design') {
    await page.goto('#/sc-098-changepw')
    await hideFixedElements(page)
  } else {
    await studentLoginAndNavigateTo(
      page,
      process.env.FR048_STUDENT_ID ?? '',
      process.env.FR048_STUDENT_PASSWORD ?? '',
      '/student/profile',
    )
    await page.getByRole('button', { name: /^change$/i }).click()
  }
  await prep(page)

  await expect(page).toHaveScreenshot('sc-098-student-changepw.png', {
    maxDiffPixelRatio: 0.02,
    animations: 'disabled',
  })
})
