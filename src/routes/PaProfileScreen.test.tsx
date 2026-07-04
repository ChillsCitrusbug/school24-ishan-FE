import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as analyticsApi from '@/features/analytics/api'
import * as authApi from '@/features/auth/api'
import * as profileApi from '@/features/profile/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/profile/api')
vi.mock('@/features/analytics/api')

const PA_USER = {
  id: 'u1',
  full_name: 'Alex Morgan',
  email: 'alex.morgan@school24.net.au',
  role: 'platform_admin' as const,
  school_id: null,
  school_name: null,
}

const PROFILE = {
  id: 'u1',
  full_name: 'Alex Morgan',
  email: 'alex.morgan@school24.net.au',
  mobile: '0400 111 222',
  role: 'platform_admin',
}

/** Same "log in via the real form, then navigate directly" pattern as
 * RolesListScreen.test.tsx's own precedent — no in-app sidebar link to
 * Profile exists yet. */
async function renderAuthenticatedAt(
  path: string,
  options: { getProfileMock?: () => Promise<profileApi.Profile> } = {},
) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user: PA_USER,
  })
  // An explicit override is always set fresh here — never left to a
  // test's own earlier mockRejectedValue/mockResolvedValue call, which
  // this default would otherwise silently overwrite.
  vi.mocked(profileApi.getProfile).mockImplementation(
    options.getProfileMock ?? (() => Promise.resolve(PROFILE)),
  )
  vi.mocked(analyticsApi.getPlatformDashboard).mockResolvedValue({
    is_empty: true,
    schools: { active: 0, inactive: 0 },
    active_students: 0,
    users_by_role: { platform_admin: 0, school_admin: 0, staff: 0, parent: 0 },
    total_orders: 0,
    total_revenue: '0',
    orders_this_week: [],
    top_schools: [],
  })

  const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
  render(
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>,
  )
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: PA_USER.email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText('Platform overview')).toBeInTheDocument())

  await act(async () => {
    await router.navigate(path)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PaProfileScreen', () => {
  it('shows the profile fields once loaded', async () => {
    await renderAuthenticatedAt('/platform-admin/profile')

    expect(await screen.findByText('alex.morgan@school24.net.au')).toBeInTheDocument()
    expect(screen.getByText('0400 111 222')).toBeInTheDocument()
  })

  it('shows a connectivity error if the profile fails to load', async () => {
    await renderAuthenticatedAt('/platform-admin/profile', {
      getProfileMock: () => Promise.reject(new Error('Network Error')),
    })

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('lets the user edit their name and mobile', async () => {
    vi.mocked(profileApi.updateProfile).mockResolvedValue({ ...PROFILE, full_name: 'Alex J. Morgan' })
    await renderAuthenticatedAt('/platform-admin/profile')
    await screen.findByText('alex.morgan@school24.net.au')

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    const nameInput = screen.getByLabelText('Full name')
    fireEvent.change(nameInput, { target: { value: 'Alex J. Morgan' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(profileApi.updateProfile).toHaveBeenCalledWith('Alex J. Morgan', '0400 111 222'),
    )
  })

  it('changes the password and shows a success confirmation', async () => {
    vi.mocked(profileApi.changePassword).mockResolvedValue({ message: 'Your password has been changed.' })
    await renderAuthenticatedAt('/platform-admin/profile')
    await screen.findByText('alex.morgan@school24.net.au')

    fireEvent.click(screen.getByRole('button', { name: /^change$/i }))
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'OldPass9!' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'NewPass9!' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'NewPass9!' } })
    fireEvent.click(screen.getByRole('button', { name: /save password/i }))

    expect(await screen.findByText('Your password has been changed.')).toBeInTheDocument()
    expect(profileApi.changePassword).toHaveBeenCalledWith('OldPass9!', 'NewPass9!', 'NewPass9!')
  })

  it('shows an inline error on a wrong current password (401), not a session-expiry redirect', async () => {
    vi.mocked(profileApi.changePassword).mockRejectedValue({
      response: { status: 401, data: { errors: 'Your current password is incorrect.' } },
    })
    await renderAuthenticatedAt('/platform-admin/profile')
    await screen.findByText('alex.morgan@school24.net.au')

    fireEvent.click(screen.getByRole('button', { name: /^change$/i }))
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'Wrong9!' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'NewPass9!' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'NewPass9!' } })
    fireEvent.click(screen.getByRole('button', { name: /save password/i }))

    expect(await screen.findByText('Your current password is incorrect.')).toBeInTheDocument()
    // Still on the form, not redirected away.
    expect(screen.getByLabelText('Current password')).toBeInTheDocument()
  })

  it('requests an email change and shows the confirmation banner', async () => {
    vi.mocked(profileApi.requestEmailChange).mockResolvedValue({
      message: "We've sent a confirmation link to your new email address.",
    })
    await renderAuthenticatedAt('/platform-admin/profile')
    await screen.findByText('alex.morgan@school24.net.au')

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    // Field/hint gotcha (established from ResetPasswordScreen.test.tsx,
    // FR-005): a Field with a hint prop folds the hint text into the
    // accessible name, so an exact-string match fails — prefix regex.
    const emailInput = screen.getByLabelText(/^Email/i)
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /update email/i }))

    expect(
      await screen.findByText(/we've sent a confirmation link to your new email address/i),
    ).toBeInTheDocument()
    expect(profileApi.requestEmailChange).toHaveBeenCalledWith('new@example.com')
  })
})
