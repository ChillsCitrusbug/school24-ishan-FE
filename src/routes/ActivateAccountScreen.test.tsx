import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as activationApi from '@/features/account-activation/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/account-activation/api')

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
  fireEvent.change(screen.getByLabelText(/^Create password/i), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Confirm password'), {
    target: { value: confirmPassword },
  })
  fireEvent.click(screen.getByRole('button', { name: /activate account/i }))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ActivateAccountScreen', () => {
  it('shows the expired-link state immediately when no token is present, without calling the API', () => {
    renderAt('/activate')

    expect(screen.getByText('This invitation has expired')).toBeInTheDocument()
    expect(activationApi.getActivationInfo).not.toHaveBeenCalled()
  })

  // EC-004: "System refuses to load the password-setup screen" for a bad
  // link — the peek must run and fail BEFORE the form ever renders.
  it('shows the expired-link state (never the password form) when the peek check fails', async () => {
    vi.mocked(activationApi.getActivationInfo).mockRejectedValue({
      response: { status: 422, data: { errors: 'This invitation has expired.' } },
    })

    renderAt('/activate?token=dead-token')

    await waitFor(() => expect(screen.getByText('This invitation has expired')).toBeInTheDocument())
    expect(screen.queryByLabelText(/^Create password/i)).not.toBeInTheDocument()
  })

  it('renders the password-setup form with the pre-filled email once the peek succeeds', async () => {
    vi.mocked(activationApi.getActivationInfo).mockResolvedValue({ email: 'sa@greenvale.edu.au' })

    renderAt('/activate?token=good-token')

    await waitFor(() => expect(screen.getByLabelText(/^Create password/i)).toBeInTheDocument())
    expect(screen.getByLabelText('Email')).toHaveValue('sa@greenvale.edu.au')
    expect(screen.getByLabelText('Email')).toBeDisabled()
  })

  it('rejects a weak password locally, without calling the API', async () => {
    vi.mocked(activationApi.getActivationInfo).mockResolvedValue({ email: 'sa@greenvale.edu.au' })
    renderAt('/activate?token=good-token')
    await waitFor(() => expect(screen.getByLabelText(/^Create password/i)).toBeInTheDocument())

    fillAndSubmit('short', 'short')

    expect(
      screen.getAllByText('Use at least 8 characters with a number and a symbol.'),
    ).toHaveLength(2)
    expect(activationApi.activateAccount).not.toHaveBeenCalled()
  })

  it('rejects a mismatched confirmation locally, without calling the API', async () => {
    vi.mocked(activationApi.getActivationInfo).mockResolvedValue({ email: 'sa@greenvale.edu.au' })
    renderAt('/activate?token=good-token')
    await waitFor(() => expect(screen.getByLabelText(/^Create password/i)).toBeInTheDocument())

    fillAndSubmit('CorrectHorseBattery9!', 'Different9!')

    expect(
      screen.getByText('New password and confirmation do not match.'),
    ).toBeInTheDocument()
    expect(activationApi.activateAccount).not.toHaveBeenCalled()
  })

  it('activates, establishes a full session, and routes a School Admin to the SA dashboard', async () => {
    vi.mocked(activationApi.getActivationInfo).mockResolvedValue({ email: 'sa@greenvale.edu.au' })
    vi.mocked(activationApi.activateAccount).mockResolvedValue({
      access_token: 'a-real-jwt',
      token_type: 'bearer',
      user: {
        id: 'u-1',
        full_name: 'Priya Nair',
        email: 'sa@greenvale.edu.au',
        role: 'school_admin',
        school_id: 's-1',
        school_name: 'Greenvale Primary',
      },
    })

    renderAt('/activate?token=good-token')
    await waitFor(() => expect(screen.getByLabelText(/^Create password/i)).toBeInTheDocument())
    fillAndSubmit()

    await waitFor(() => expect(screen.getByText(/Good morning, Priya/)).toBeInTheDocument())
    expect(activationApi.activateAccount).toHaveBeenCalledWith(
      'good-token',
      'CorrectHorseBattery9!',
      'CorrectHorseBattery9!',
    )
  })

  it('shows the backend error banner on a 409 (already-used token) without navigating away', async () => {
    vi.mocked(activationApi.getActivationInfo).mockResolvedValue({ email: 'sa@greenvale.edu.au' })
    vi.mocked(activationApi.activateAccount).mockRejectedValue({
      response: { status: 409, data: { errors: 'This invitation link has already been used.' } },
    })

    renderAt('/activate?token=used-token')
    await waitFor(() => expect(screen.getByLabelText(/^Create password/i)).toBeInTheDocument())
    fillAndSubmit()

    expect(
      await screen.findByText('This invitation link has already been used.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /activate account/i })).toBeInTheDocument()
  })

  // Same class of bug fixed this session for Register/Login — a network/
  // CORS failure (no `response` at all) must never show a domain-specific
  // guess.
  it('shows a generic connectivity message on a network/CORS failure during activation', async () => {
    vi.mocked(activationApi.getActivationInfo).mockResolvedValue({ email: 'sa@greenvale.edu.au' })
    vi.mocked(activationApi.activateAccount).mockRejectedValue(new Error('Network Error'))

    renderAt('/activate?token=good-token')
    await waitFor(() => expect(screen.getByLabelText(/^Create password/i)).toBeInTheDocument())
    fillAndSubmit()

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })
})
