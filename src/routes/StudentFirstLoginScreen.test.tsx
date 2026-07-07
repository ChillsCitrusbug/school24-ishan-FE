import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as studentAuthApi from '@/features/student-auth/api'
import { routes } from './index'

vi.mock('@/features/student-auth/api')

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

async function reachFirstLoginScreen() {
  vi.mocked(studentAuthApi.login).mockResolvedValue({
    must_change_password: true,
    change_token: 'change-token-abc',
  })
  renderAt('/student-login')
  fireEvent.change(screen.getByLabelText('Student ID'), { target: { value: 'S-41880' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'TempPassword1!' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText('Set your password')).toBeInTheDocument())
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('StudentFirstLoginScreen', () => {
  it('redirects to /student-login when visited directly with no pending challenge', () => {
    renderAt('/student-first-login')

    expect(screen.getByText('Student sign in')).toBeInTheDocument()
  })

  it('is reachable after a first-login challenge and submits against the held change_token', async () => {
    await reachFirstLoginScreen()
    vi.mocked(studentAuthApi.changePassword).mockResolvedValue({
      access_token: 'full-access-token',
      token_type: 'bearer',
      student: { id: 's1', full_name: 'Noah Thompson', student_id: 'S-41880', school_id: 'sc1' },
    })

    fireEvent.change(screen.getByLabelText(/^New password/i), {
      target: { value: 'NewPassw0rd!' },
    })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'NewPassw0rd!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save and continue/i }))

    await waitFor(() =>
      expect(screen.getByText(/grab your usual in a tap/i)).toBeInTheDocument(),
    )
    expect(studentAuthApi.changePassword).toHaveBeenCalledWith(
      'change-token-abc',
      'NewPassw0rd!',
      'NewPassw0rd!',
    )
  })

  it('shows an inline error and stays on the form when the change fails', async () => {
    await reachFirstLoginScreen()
    vi.mocked(studentAuthApi.changePassword).mockRejectedValue({
      response: { status: 400, data: { errors: 'New password and confirmation do not match.' } },
    })

    fireEvent.change(screen.getByLabelText(/^New password/i), {
      target: { value: 'NewPassw0rd!' },
    })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'Different1!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save and continue/i }))

    expect(
      await screen.findByText('New password and confirmation do not match.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save and continue/i })).toBeInTheDocument()
  })

  // Review finding, FR-002 (Minor): the field-reconciliation record
  // claimed client-side validation existed before it actually did — this
  // pins the real thing, and that it never even calls the API for an
  // obviously-invalid submission.
  it('rejects a mismatched confirmation locally, without calling the API', async () => {
    await reachFirstLoginScreen()

    fireEvent.change(screen.getByLabelText(/^New password/i), {
      target: { value: 'NewPassw0rd!' },
    })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'Different1!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save and continue/i }))

    expect(
      await screen.findByText('New password and confirmation do not match.'),
    ).toBeInTheDocument()
    expect(studentAuthApi.changePassword).not.toHaveBeenCalled()
  })

  it('rejects a weak password locally, without calling the API', async () => {
    await reachFirstLoginScreen()

    fireEvent.change(screen.getByLabelText(/^New password/i), { target: { value: 'short1!' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'short1!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save and continue/i }))

    // This exact copy also appears as the field's static hint, so two
    // matches are expected once the error banner renders too (the hint
    // plus the banner) — the assertion below confirms the banner itself
    // appeared, not just the pre-existing hint.
    await waitFor(() =>
      expect(
        screen.getAllByText('Use at least 8 characters with a number and a symbol.'),
      ).toHaveLength(2),
    )
    expect(studentAuthApi.changePassword).not.toHaveBeenCalled()
  })

  // Review finding, FR-002 (Minor): an expired change_token (401) used to
  // leave the student stuck re-submitting against a dead token with no
  // way out — it must now bounce back to /student-login with an
  // explanation instead.
  it('redirects to /student-login with an explanation when the change_token has expired (401)', async () => {
    await reachFirstLoginScreen()
    vi.mocked(studentAuthApi.changePassword).mockRejectedValue({
      response: { status: 401, data: { errors: 'Unauthorized' } },
    })

    fireEvent.change(screen.getByLabelText(/^New password/i), {
      target: { value: 'NewPassw0rd!' },
    })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'NewPassw0rd!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save and continue/i }))

    expect(await screen.findByText('Student sign in')).toBeInTheDocument()
    expect(
      screen.getByText('That took too long — please sign in again to set your password.'),
    ).toBeInTheDocument()
  })
})
