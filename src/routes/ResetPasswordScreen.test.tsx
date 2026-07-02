import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as passwordResetApi from '@/features/password-reset/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/password-reset/api')

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

function fillAndSubmit(password = 'CorrectHorseBattery9!', confirmPassword = password) {
  fireEvent.change(screen.getByLabelText(/^New password/i), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Confirm new password'), {
    target: { value: confirmPassword },
  })
  fireEvent.click(screen.getByRole('button', { name: /save password/i }))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ResetPasswordScreen', () => {
  it('shows the invalid-link state immediately when no token is present, without calling the API', () => {
    renderAt('/reset-password')

    expect(screen.getByText('This reset link is invalid')).toBeInTheDocument()
    expect(passwordResetApi.resetPassword).not.toHaveBeenCalled()
  })

  it('renders the set-new-password form when a token is present', () => {
    renderAt('/reset-password?token=abc123')

    expect(screen.getByText('Set a new password')).toBeInTheDocument()
    expect(screen.getByLabelText(/^New password/i)).toBeInTheDocument()
  })

  it('submits the new password and redirects to login on success', async () => {
    vi.mocked(passwordResetApi.resetPassword).mockResolvedValue({
      message: 'Your password has been reset. You can now sign in.',
    })

    renderAt('/reset-password?token=abc123')
    fillAndSubmit()

    await waitFor(() =>
      expect(passwordResetApi.resetPassword).toHaveBeenCalledWith(
        'abc123',
        'CorrectHorseBattery9!',
        'CorrectHorseBattery9!',
      ),
    )
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeInTheDocument())
  })

  it('shows an inline error and keeps the form when passwords do not match', async () => {
    renderAt('/reset-password?token=abc123')
    fillAndSubmit('CorrectHorseBattery9!', 'Different1!')

    expect(
      await screen.findByText('New password and confirmation do not match.'),
    ).toBeInTheDocument()
    expect(passwordResetApi.resetPassword).not.toHaveBeenCalled()
  })

  it('switches to the invalid-link state on a 409 (already used)', async () => {
    vi.mocked(passwordResetApi.resetPassword).mockRejectedValue({
      response: { status: 409, data: { errors: 'This reset link has already been used.' } },
    })

    renderAt('/reset-password?token=abc123')
    fillAndSubmit()

    expect(await screen.findByText('This reset link is invalid')).toBeInTheDocument()
  })

  it('switches to the invalid-link state on a 422 (expired)', async () => {
    vi.mocked(passwordResetApi.resetPassword).mockRejectedValue({
      response: { status: 422, data: { errors: 'This reset link has expired.' } },
    })

    renderAt('/reset-password?token=abc123')
    fillAndSubmit()

    expect(await screen.findByText('This reset link is invalid')).toBeInTheDocument()
  })

  // Review finding (Minor): the 404 case (also part of the ticket's own
  // 404/409/422 triplet) and a genuine network failure (no `response`
  // object at all) weren't covered for this screen, even though the
  // implementation already handled both correctly.
  it('switches to the invalid-link state on a 404 (unknown token)', async () => {
    vi.mocked(passwordResetApi.resetPassword).mockRejectedValue({
      response: { status: 404, data: { errors: 'This reset link is invalid.' } },
    })

    renderAt('/reset-password?token=abc123')
    fillAndSubmit()

    expect(await screen.findByText('This reset link is invalid')).toBeInTheDocument()
  })

  it('shows an inline banner (not the invalid-link state) on a genuine network failure', async () => {
    vi.mocked(passwordResetApi.resetPassword).mockRejectedValue(new Error('Network Error'))

    renderAt('/reset-password?token=abc123')
    fillAndSubmit()

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/^New password/i)).toBeInTheDocument()
  })

  it('shows an inline banner (not the invalid-link state) on a weak-password 400', async () => {
    vi.mocked(passwordResetApi.resetPassword).mockRejectedValue({
      response: { status: 400, data: { errors: 'Use at least 8 characters with a number and a symbol.' } },
    })

    renderAt('/reset-password?token=abc123')
    fillAndSubmit()

    expect(
      await screen.findByText('Use at least 8 characters with a number and a symbol.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/^New password/i)).toBeInTheDocument()
  })

  it('the "Request a new link" button on the invalid state navigates to forgot-password', async () => {
    renderAt('/reset-password')

    fireEvent.click(screen.getByRole('button', { name: /request a new link/i }))

    expect(await screen.findByText('Forgot your password?')).toBeInTheDocument()
  })
})
