import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as twoFactorApi from '@/features/two-factor/api'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/two-factor/api')

const SA_USER_OFF = {
  id: 'u1',
  full_name: 'Priya Nair',
  email: 'priya@example.com',
  role: 'school_admin' as const,
  school_id: 's1',
  school_name: 'Greenvale Primary',
  two_factor_enabled: false,
}

const SA_USER_ON = { ...SA_USER_OFF, two_factor_enabled: true }

async function loginAs(user: typeof SA_USER_OFF) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user,
  })
  // refreshUser() (AuthContext.tsx) calls getMe() after a successful
  // enable/disable — default it to "no change" so tests that don't care
  // about the post-refresh value aren't broken by an unmocked call.
  vi.mocked(authApi.getMe).mockResolvedValue(user)
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
  render(
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>,
  )
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: user.email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText(/good morning/i)).toBeInTheDocument())

  await act(async () => {
    await router.navigate('/two-factor-setup')
  })
  return router
}

function fillDigits(code: string) {
  code.split('').forEach((digit, i) => {
    fireEvent.change(screen.getByLabelText(`Digit ${i + 1}`), { target: { value: digit } })
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TwoFactorSetupScreen', () => {
  it('shows the off state for a user without 2FA enabled', async () => {
    await loginAs(SA_USER_OFF)

    expect(await screen.findByText('Off')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /turn on two-factor authentication/i })).toBeInTheDocument()
  })

  it('shows the on state for a user with 2FA already enabled', async () => {
    await loginAs(SA_USER_ON)

    expect(await screen.findByText('On')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /turn off two-factor authentication/i }),
    ).toBeInTheDocument()
  })

  it('starts enrollment, confirms the code, and shows backup codes', async () => {
    await loginAs(SA_USER_OFF)
    vi.mocked(twoFactorApi.startEnable).mockResolvedValue({
      message: "We've emailed you a 6-digit code to confirm setup.",
      challenge_token: 'challenge-xyz',
    })
    vi.mocked(twoFactorApi.confirmEnable).mockResolvedValue({
      message: 'Two-factor authentication is on.',
      backup_codes: Array.from({ length: 10 }, (_, i) => `aaaa-000${i}`),
    })
    vi.mocked(authApi.getMe).mockResolvedValue(SA_USER_ON)

    fireEvent.click(await screen.findByRole('button', { name: /turn on two-factor authentication/i }))
    await waitFor(() => expect(screen.getByLabelText('Digit 1')).toBeInTheDocument())

    fillDigits('123456')
    fireEvent.click(screen.getByRole('button', { name: /verify & turn on/i }))

    expect(await screen.findByText('Two-factor is on')).toBeInTheDocument()
    expect(screen.getByText('aaaa-0000')).toBeInTheDocument()
    expect(twoFactorApi.confirmEnable).toHaveBeenCalledWith('challenge-xyz', '123456')
  })

  it('shows an inline error on an incorrect confirmation code', async () => {
    await loginAs(SA_USER_OFF)
    vi.mocked(twoFactorApi.startEnable).mockResolvedValue({
      message: "We've emailed you a 6-digit code to confirm setup.",
      challenge_token: 'challenge-xyz',
    })
    vi.mocked(twoFactorApi.confirmEnable).mockRejectedValue({
      response: { status: 400, data: { errors: 'That code is incorrect or has expired. Please try again.' } },
    })

    fireEvent.click(await screen.findByRole('button', { name: /turn on two-factor authentication/i }))
    await waitFor(() => expect(screen.getByLabelText('Digit 1')).toBeInTheDocument())
    fillDigits('000000')
    fireEvent.click(screen.getByRole('button', { name: /verify & turn on/i }))

    expect(
      await screen.findByText('That code is incorrect or has expired. Please try again.'),
    ).toBeInTheDocument()
  })

  it('disables 2FA', async () => {
    await loginAs(SA_USER_ON)
    vi.mocked(twoFactorApi.disable).mockResolvedValue({
      message: 'Two-factor authentication has been turned off.',
    })
    vi.mocked(authApi.getMe).mockResolvedValue(SA_USER_OFF)

    fireEvent.click(
      await screen.findByRole('button', { name: /turn off two-factor authentication/i }),
    )

    await waitFor(() => expect(screen.getByText('Off')).toBeInTheDocument())
    expect(twoFactorApi.disable).toHaveBeenCalled()
  })

  it('reflects the enabled state on a later remount, not just in this same mount (review round 1, Major finding #3)', async () => {
    // Reproduces the reviewer's own exact scenario: enable 2FA, then
    // navigate away and back — the screen must show "On" from the
    // context's own refreshed user, not stale login-time data.
    const router = await loginAs(SA_USER_OFF)
    vi.mocked(twoFactorApi.startEnable).mockResolvedValue({
      message: "We've emailed you a 6-digit code to confirm setup.",
      challenge_token: 'challenge-xyz',
    })
    vi.mocked(twoFactorApi.confirmEnable).mockResolvedValue({
      message: 'Two-factor authentication is on.',
      backup_codes: Array.from({ length: 10 }, (_, i) => `aaaa-000${i}`),
    })
    vi.mocked(authApi.getMe).mockResolvedValue(SA_USER_ON)

    fireEvent.click(await screen.findByRole('button', { name: /turn on two-factor authentication/i }))
    await waitFor(() => expect(screen.getByLabelText('Digit 1')).toBeInTheDocument())
    fillDigits('123456')
    fireEvent.click(screen.getByRole('button', { name: /verify & turn on/i }))
    await screen.findByText('Two-factor is on')

    // Navigate away, then back — unmounts and remounts
    // TwoFactorSetupScreen on the SAME AuthProvider instance, so its
    // initial `mode` state is whatever refreshUser() left in context.
    await act(async () => {
      await router.navigate('/school-admin/profile')
    })
    await act(async () => {
      await router.navigate('/two-factor-setup')
    })

    expect(await screen.findByText('On')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /turn off two-factor authentication/i }),
    ).toBeInTheDocument()
  })
})
