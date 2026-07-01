import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import { routes } from './index'

vi.mock('@/features/auth/api')

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('LoginScreen', () => {
  it('routes a School Admin to the School Admin dashboard on success', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      access_token: 'token',
      token_type: 'bearer',
      user: {
        id: 'u1',
        full_name: 'Priya Nair',
        email: 'priya@example.com',
        role: 'school_admin',
        school_id: 's1',
        school_name: 'Greenvale Primary',
      },
    })

    renderAt('/login')
    fillAndSubmit('priya@example.com', 'CorrectHorseBattery9!')

    await waitFor(() => expect(screen.getByText(/let.s set up your school/i)).toBeInTheDocument())
    // Appears in both the sidebar subtitle and the greeting line — assert
    // it rendered at least once rather than requiring exactly one match.
    expect(screen.getAllByText('Greenvale Primary', { exact: false }).length).toBeGreaterThan(0)
  })

  it('routes a Parent to the generic placeholder dashboard on success', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      access_token: 'token',
      token_type: 'bearer',
      user: {
        id: 'u2',
        full_name: 'Sarah Thompson',
        email: 'sarah@example.com',
        role: 'parent',
        school_id: null,
        school_name: null,
      },
    })

    renderAt('/login')
    fillAndSubmit('sarah@example.com', 'CorrectHorseBattery9!')

    await waitFor(() => expect(screen.getByText(/dashboard coming soon/i)).toBeInTheDocument())
  })

  it('shows the generic EC-001 error banner on a 401 without navigating away', async () => {
    vi.mocked(authApi.login).mockRejectedValue({
      response: {
        status: 401,
        data: { errors: 'The email or password is incorrect. Please try again.' },
      },
    })

    renderAt('/login')
    fillAndSubmit('wrong@example.com', 'wrong')

    expect(
      await screen.findByText('The email or password is incorrect. Please try again.'),
    ).toBeInTheDocument()
    // Still on the login form, not navigated anywhere.
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('navigates to the Blocked screen on a 403 (deactivated account)', async () => {
    vi.mocked(authApi.login).mockRejectedValue({
      response: {
        status: 403,
        data: { errors: 'Your account has been deactivated. Contact your school administrator.' },
      },
    })

    renderAt('/login')
    fillAndSubmit('deactivated@example.com', 'whatever')

    expect(await screen.findByText('Account deactivated')).toBeInTheDocument()
  })

  it('shows an inline banner (not the Blocked/"deactivated" screen) for the unverified-email 403 case', async () => {
    // Review finding, FR-001: a 403 for pending-verification is a
    // DIFFERENT case from deactivation and must never say "deactivated".
    vi.mocked(authApi.login).mockRejectedValue({
      response: {
        status: 403,
        data: { errors: 'Email not verified. Please check your inbox.' },
      },
    })

    renderAt('/login')
    fillAndSubmit('unverified@example.com', 'whatever')

    expect(await screen.findByText('Email not verified. Please check your inbox.')).toBeInTheDocument()
    // Never claims the account was deactivated, and never navigates away.
    expect(screen.queryByText('Account deactivated')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })
})
