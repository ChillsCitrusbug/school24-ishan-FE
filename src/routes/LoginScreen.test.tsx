import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')

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

    await waitFor(() => expect(screen.getByText(/good morning/i)).toBeInTheDocument())
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

  // Bug report: a CORS/network failure was incorrectly showing "The
  // email or password is incorrect" — a real network-level failure
  // (axios never gets a `response` at all) must show a generic message
  // instead, never a domain-specific guess about the credentials.
  it('shows a generic connectivity message (not "email or password incorrect") on a network/CORS failure', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('Network Error'))

    renderAt('/login')
    fillAndSubmit('someone@example.com', 'whatever')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('The email or password is incorrect. Please try again.'),
    ).not.toBeInTheDocument()
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

  it('navigates to the Blocked screen with the suspended variant on a 403 (school deactivated, FR-008)', async () => {
    vi.mocked(authApi.login).mockRejectedValue({
      response: {
        status: 403,
        data: {
          errors: "This school's access to School24 has been suspended. Please contact the platform operator.",
        },
      },
    })

    renderAt('/login')
    fillAndSubmit('sa@example.com', 'whatever')

    expect(await screen.findByText('School access suspended')).toBeInTheDocument()
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

  it('the "Create an account" link now navigates to /register (FR-004)', () => {
    // Review-driven fix, FR-004: this link had href="#" since FR-001 shipped
    // before FR-004 existed — closing that loop, not inventing new UI.
    renderAt('/login')

    fireEvent.click(screen.getByRole('link', { name: /create an account/i }))

    expect(screen.getByText('Create your account')).toBeInTheDocument()
  })

  it('the "Forgot password?" link now navigates to /forgot-password (FR-005)', () => {
    // Same class of fix as "Create an account" above — this link had
    // href="#" since FR-001 shipped before FR-005 existed.
    renderAt('/login')

    fireEvent.click(screen.getByRole('link', { name: /forgot password/i }))

    expect(screen.getByText('Forgot your password?')).toBeInTheDocument()
  })

  it('routes to the two-factor challenge screen instead of a role home when 2FA is required (FR-050)', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      must_provide_2fa: true,
      challenge_token: 'a-real-challenge-token',
    })

    renderAt('/login')
    fillAndSubmit('priya@example.com', 'CorrectHorseBattery9!')

    expect(await screen.findByText('Two-factor authentication')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard coming soon')).not.toBeInTheDocument()
  })

  it('the "If you are a student, login here" link navigates to the real Student login', async () => {
    renderAt('/login')

    fireEvent.click(screen.getByRole('link', { name: /if you are a student, login here/i }))

    expect(await screen.findByText('Student sign in')).toBeInTheDocument()
  })
})
