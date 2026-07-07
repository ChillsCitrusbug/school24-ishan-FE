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

function fillAndSubmit(studentId: string, password: string) {
  fireEvent.change(screen.getByLabelText('Student ID'), { target: { value: studentId } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('StudentLoginScreen', () => {
  it('routes to the student home on a normal (non-first) login', async () => {
    vi.mocked(studentAuthApi.login).mockResolvedValue({
      access_token: 'token',
      token_type: 'bearer',
      student: { id: 's1', full_name: 'Noah Thompson', student_id: 'S-41880', school_id: 'sc1' },
    })

    renderAt('/student-login')
    fillAndSubmit('S-41880', 'CorrectHorseBattery9!')

    await waitFor(() =>
      expect(screen.getByText(/grab your usual in a tap/i)).toBeInTheDocument(),
    )
  })

  it('routes to the forced first-login screen when must_change_password is true (EC-002)', async () => {
    vi.mocked(studentAuthApi.login).mockResolvedValue({
      must_change_password: true,
      change_token: 'change-token-abc',
    })

    renderAt('/student-login')
    fillAndSubmit('S-41880', 'TempPassword1!')

    await waitFor(() => expect(screen.getByText('Set your password')).toBeInTheDocument())
  })

  it('shows the generic non-enumerating error banner on a 401 without navigating away', async () => {
    vi.mocked(studentAuthApi.login).mockRejectedValue({
      response: {
        status: 401,
        data: { errors: "That Student ID or password isn't right. Try again." },
      },
    })

    renderAt('/student-login')
    fillAndSubmit('S-NOBODY', 'wrong')

    expect(
      await screen.findByText("That Student ID or password isn't right. Try again."),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('navigates to the Blocked screen on a 403 (deactivated student)', async () => {
    vi.mocked(studentAuthApi.login).mockRejectedValue({
      response: {
        status: 403,
        data: { errors: 'This account has been deactivated. Contact your school office.' },
      },
    })

    renderAt('/student-login')
    fillAndSubmit('S-41880', 'whatever')

    expect(await screen.findByText('Account deactivated')).toBeInTheDocument()
  })

  it('navigates to the Blocked screen with the suspended variant on a 403 (school deactivated, FR-008)', async () => {
    vi.mocked(studentAuthApi.login).mockRejectedValue({
      response: {
        status: 403,
        data: {
          errors: "This school's access to School24 has been suspended. Please contact the platform operator.",
        },
      },
    })

    renderAt('/student-login')
    fillAndSubmit('S-41880', 'whatever')

    expect(await screen.findByText('School access suspended')).toBeInTheDocument()
  })
})
