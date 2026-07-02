import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as registrationApi from '@/features/registration/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/registration/api')

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

afterEach(() => {
  vi.restoreAllMocks()
})

describe('VerifyEmailScreen', () => {
  it('shows an error immediately when no token is present in the URL', () => {
    renderAt('/verify-email')

    expect(screen.getByText('Verification failed')).toBeInTheDocument()
    expect(screen.getByText('This verification link is invalid.')).toBeInTheDocument()
    expect(registrationApi.verifyEmail).not.toHaveBeenCalled()
  })

  it('shows a success state and the returned message for a valid token', async () => {
    vi.mocked(registrationApi.verifyEmail).mockResolvedValue({
      message: 'Your email has been verified. You can now sign in.',
    })

    renderAt('/verify-email?token=abc123')

    await waitFor(() => expect(screen.getByText('Email verified')).toBeInTheDocument())
    expect(
      screen.getByText('Your email has been verified. You can now sign in.'),
    ).toBeInTheDocument()
    expect(registrationApi.verifyEmail).toHaveBeenCalledWith('abc123')
  })

  it('shows the backend error message for an already-used token', async () => {
    vi.mocked(registrationApi.verifyEmail).mockRejectedValue({
      response: { status: 409, data: { errors: 'This verification link has already been used.' } },
    })

    renderAt('/verify-email?token=used-token')

    await waitFor(() => expect(screen.getByText('Verification failed')).toBeInTheDocument())
    expect(
      screen.getByText('This verification link has already been used.'),
    ).toBeInTheDocument()
  })

  it('shows the backend error message for an expired token', async () => {
    vi.mocked(registrationApi.verifyEmail).mockRejectedValue({
      response: { status: 410, data: { errors: 'This verification link has expired.' } },
    })

    renderAt('/verify-email?token=expired-token')

    await waitFor(() => expect(screen.getByText('Verification failed')).toBeInTheDocument())
    expect(screen.getByText('This verification link has expired.')).toBeInTheDocument()
  })
})
