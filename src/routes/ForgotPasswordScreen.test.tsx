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

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ForgotPasswordScreen', () => {
  it('shows the check-your-email confirmation after a successful submit', async () => {
    vi.mocked(passwordResetApi.requestPasswordReset).mockResolvedValue({
      message: 'If the email is registered, a reset link has been sent',
    })

    renderAt('/forgot-password')
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(await screen.findByText('Check your email')).toBeInTheDocument()
    expect(passwordResetApi.requestPasswordReset).toHaveBeenCalledWith('jane@example.com')
  })

  it('shows the same confirmation even for an unregistered-looking email (non-enumerating)', async () => {
    vi.mocked(passwordResetApi.requestPasswordReset).mockResolvedValue({
      message: 'If the email is registered, a reset link has been sent',
    })

    renderAt('/forgot-password')
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nobody@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(await screen.findByText('Check your email')).toBeInTheDocument()
  })

  it('shows an error banner and stays on the form when the request fails outright', async () => {
    vi.mocked(passwordResetApi.requestPasswordReset).mockRejectedValue(new Error('Network Error'))

    renderAt('/forgot-password')
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('the "Back to sign in" link navigates to the login screen', async () => {
    renderAt('/forgot-password')

    fireEvent.click(screen.getByRole('link', { name: /back to sign in/i }))

    await waitFor(() => expect(screen.getByLabelText('Password')).toBeInTheDocument())
  })
})
