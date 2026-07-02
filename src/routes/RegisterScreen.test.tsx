import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

function fillAndSubmit(overrides: Partial<Record<'fullName' | 'email' | 'mobile' | 'password', string>> = {}) {
  fireEvent.change(screen.getByLabelText('Full name'), {
    target: { value: overrides.fullName ?? 'Sarah Thompson' },
  })
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: overrides.email ?? 'sarah@example.com' },
  })
  fireEvent.change(screen.getByLabelText('Mobile'), {
    target: { value: overrides.mobile ?? '0412345678' },
  })
  fireEvent.change(screen.getByLabelText(/^Password/i), {
    target: { value: overrides.password ?? 'CorrectHorseBattery9!' },
  })
  fireEvent.click(screen.getByRole('button', { name: /create account/i }))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('RegisterScreen', () => {
  it('routes to the registration-sent confirmation on success', async () => {
    vi.mocked(registrationApi.register).mockResolvedValue({
      message: 'Registration successful. Check your email to verify your account.',
    })

    renderAt('/register')
    fillAndSubmit()

    await waitFor(() => expect(screen.getByText('Check your email')).toBeInTheDocument())
    expect(registrationApi.register).toHaveBeenCalledWith(
      'Sarah Thompson',
      'sarah@example.com',
      '0412345678',
      'CorrectHorseBattery9!',
    )
  })

  it('rejects a weak password locally, without calling the API', () => {
    renderAt('/register')
    fillAndSubmit({ password: 'short' })

    // This exact copy also appears as the field's static hint, so two
    // matches are expected once the error banner renders too.
    expect(
      screen.getAllByText('Use at least 8 characters with a number and a symbol.'),
    ).toHaveLength(2)
    expect(registrationApi.register).not.toHaveBeenCalled()
  })

  it('shows the duplicate-email banner on a 409 without navigating away', async () => {
    vi.mocked(registrationApi.register).mockRejectedValue({
      response: {
        status: 409,
        data: { errors: 'An account with this email already exists. Try signing in instead.' },
      },
    })

    renderAt('/register')
    fillAndSubmit()

    expect(
      await screen.findByText('An account with this email already exists. Try signing in instead.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  // Bug report: a CORS/network failure was incorrectly showing "An
  // account with this email already exists" — a real network-level
  // failure (axios never gets a `response` at all) must show a generic
  // message instead, never a domain-specific guess.
  it('shows a generic connectivity message (not "account already exists") on a network/CORS failure', async () => {
    vi.mocked(registrationApi.register).mockRejectedValue(new Error('Network Error'))

    renderAt('/register')
    fillAndSubmit()

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('An account with this email already exists. Try signing in instead.'),
    ).not.toBeInTheDocument()
  })
})
