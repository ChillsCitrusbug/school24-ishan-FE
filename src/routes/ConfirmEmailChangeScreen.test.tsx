import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as profileApi from '@/features/profile/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/profile/api')

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

describe('ConfirmEmailChangeScreen', () => {
  it('shows an error immediately when no token is present in the URL', () => {
    renderAt('/confirm-email-change')

    expect(screen.getByText('Confirmation failed')).toBeInTheDocument()
    expect(screen.getByText('This confirmation link is invalid.')).toBeInTheDocument()
    expect(profileApi.confirmEmailChange).not.toHaveBeenCalled()
  })

  it('shows a success state and the returned message for a valid token', async () => {
    vi.mocked(profileApi.confirmEmailChange).mockResolvedValue({
      message: 'Your email address has been updated.',
    })

    renderAt('/confirm-email-change?token=abc123')

    await waitFor(() => expect(screen.getByText('Email address updated')).toBeInTheDocument())
    expect(screen.getByText('Your email address has been updated.')).toBeInTheDocument()
    expect(profileApi.confirmEmailChange).toHaveBeenCalledWith('abc123')
  })

  it('shows the backend error message for an already-used token', async () => {
    vi.mocked(profileApi.confirmEmailChange).mockRejectedValue({
      response: { status: 409, data: { errors: 'This confirmation link has already been used.' } },
    })

    renderAt('/confirm-email-change?token=used-token')

    await waitFor(() => expect(screen.getByText('Confirmation failed')).toBeInTheDocument())
    expect(screen.getByText('This confirmation link has already been used.')).toBeInTheDocument()
  })

  it('shows the backend error message for an expired token', async () => {
    vi.mocked(profileApi.confirmEmailChange).mockRejectedValue({
      response: { status: 422, data: { errors: 'This confirmation link has expired.' } },
    })

    renderAt('/confirm-email-change?token=expired-token')

    await waitFor(() => expect(screen.getByText('Confirmation failed')).toBeInTheDocument())
    expect(screen.getByText('This confirmation link has expired.')).toBeInTheDocument()
  })

  it('shows the backend error message for an unknown token', async () => {
    vi.mocked(profileApi.confirmEmailChange).mockRejectedValue({
      response: { status: 404, data: { errors: 'This confirmation link is invalid.' } },
    })

    renderAt('/confirm-email-change?token=unknown-token')

    await waitFor(() => expect(screen.getByText('Confirmation failed')).toBeInTheDocument())
    expect(screen.getByText('This confirmation link is invalid.')).toBeInTheDocument()
  })
})
