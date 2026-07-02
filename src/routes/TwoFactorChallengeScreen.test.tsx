import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as twoFactorApi from '@/features/two-factor/api'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/two-factor/api')

const SA_USER = {
  id: 'u1',
  full_name: 'Priya Nair',
  email: 'priya@example.com',
  role: 'school_admin' as const,
  school_id: 's1',
  school_name: 'Greenvale Primary',
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>,
  )
}

/** Logs in (mocked to return a 2FA challenge) and lands on the challenge
 * screen — same "real login flow, then assert on the next screen"
 * pattern as every other login-adjacent test in this codebase. */
async function reachChallengeScreen() {
  vi.mocked(authApi.login).mockResolvedValue({
    must_provide_2fa: true,
    challenge_token: 'challenge-abc',
  })
  renderAt('/login')
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: SA_USER.email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText('Two-factor authentication')).toBeInTheDocument())
}

function fillDigits(code: string) {
  code.split('').forEach((digit, i) => {
    fireEvent.change(screen.getByLabelText(`Digit ${i + 1}`), { target: { value: digit } })
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TwoFactorChallengeScreen', () => {
  it('redirects to /login when visited directly with no pending challenge', () => {
    renderAt('/two-factor-challenge')

    expect(screen.getByText('Welcome back')).toBeInTheDocument()
  })

  it('verifies the code and routes to the role home on success', async () => {
    await reachChallengeScreen()
    vi.mocked(twoFactorApi.verifyLoginChallenge).mockResolvedValue({
      access_token: 'a-real-jwt',
      token_type: 'bearer',
      user: SA_USER,
    })

    fillDigits('123456')
    fireEvent.click(screen.getByRole('button', { name: /verify & continue/i }))

    await waitFor(() => expect(screen.getByText(/let.s set up your school/i)).toBeInTheDocument())
    expect(twoFactorApi.verifyLoginChallenge).toHaveBeenCalledWith('challenge-abc', '123456')
  })

  it('shows an inline error on an incorrect code, stays on the form', async () => {
    await reachChallengeScreen()
    vi.mocked(twoFactorApi.verifyLoginChallenge).mockRejectedValue({
      response: { status: 401, data: { errors: 'That code is incorrect or has expired. Please try again.' } },
    })

    fillDigits('000000')
    fireEvent.click(screen.getByRole('button', { name: /verify & continue/i }))

    expect(
      await screen.findByText('That code is incorrect or has expired. Please try again.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Two-factor authentication')).toBeInTheDocument()
  })

  it('resends the code', async () => {
    await reachChallengeScreen()
    vi.mocked(twoFactorApi.resendCode).mockResolvedValue({ message: "We've sent you a new code." })

    fireEvent.click(screen.getByRole('button', { name: /resend code/i }))

    expect(await screen.findByText("We've sent you a new code.")).toBeInTheDocument()
    expect(twoFactorApi.resendCode).toHaveBeenCalledWith('challenge-abc')
  })

  it('switches to the backup-code path and verifies via a backup code', async () => {
    await reachChallengeScreen()
    vi.mocked(twoFactorApi.verifyLoginBackupCode).mockResolvedValue({
      access_token: 'a-real-jwt',
      token_type: 'bearer',
      user: SA_USER,
    })

    fireEvent.click(screen.getByRole('button', { name: /use a backup code/i }))
    fireEvent.change(screen.getByLabelText('Backup code'), { target: { value: '4f2a-9c1d' } })
    fireEvent.click(screen.getByRole('button', { name: /verify & continue/i }))

    await waitFor(() => expect(screen.getByText(/let.s set up your school/i)).toBeInTheDocument())
    expect(twoFactorApi.verifyLoginBackupCode).toHaveBeenCalledWith('challenge-abc', '4f2a-9c1d')
  })

  it('shows an inline error on an incorrect backup code', async () => {
    await reachChallengeScreen()
    vi.mocked(twoFactorApi.verifyLoginBackupCode).mockRejectedValue({
      response: {
        status: 401,
        data: { errors: 'That backup code is incorrect or has already been used.' },
      },
    })

    fireEvent.click(screen.getByRole('button', { name: /use a backup code/i }))
    fireEvent.change(screen.getByLabelText('Backup code'), { target: { value: '0000-0000' } })
    fireEvent.click(screen.getByRole('button', { name: /verify & continue/i }))

    expect(
      await screen.findByText('That backup code is incorrect or has already been used.'),
    ).toBeInTheDocument()
  })
})
