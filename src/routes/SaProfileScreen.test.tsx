import { fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as profileApi from '@/features/profile/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/profile/api')

const SA_USER = {
  id: 'u1',
  full_name: 'Priya Nair',
  email: 'priya.nair@greenvale.edu.au',
  role: 'school_admin' as const,
  school_id: 's1',
  school_name: 'Greenvale Primary',
}

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * Smoke test only — the shared behavior (edit/password-change/email-
 * change/errors) is exhaustively covered once, against PaProfileScreen
 * (PaProfileScreen.test.tsx). This confirms School Admin's own
 * role-specific wiring (nav/labels/copy) actually renders.
 */
describe('SaProfileScreen', () => {
  it('renders the School Admin profile with its own role-specific notification labels', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      access_token: 'a-real-jwt',
      token_type: 'bearer',
      user: SA_USER,
    })
    vi.mocked(profileApi.getProfile).mockResolvedValue({
      id: 'u1',
      full_name: 'Priya Nair',
      email: 'priya.nair@greenvale.edu.au',
      mobile: '0413 552 008',
      role: 'school_admin',
    })

    const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
    render(
      <AuthProvider>
        <StudentAuthProvider>
          <RouterProvider router={router} />
        </StudentAuthProvider>
      </AuthProvider>,
    )
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: SA_USER.email } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(screen.getByText(/good morning/i)).toBeInTheDocument())

    await act(async () => {
      await router.navigate('/school-admin/profile')
    })

    expect(await screen.findByText('priya.nair@greenvale.edu.au')).toBeInTheDocument()
    expect(screen.getByText('0413 552 008')).toBeInTheDocument()
    expect(screen.getByText('New link approvals')).toBeInTheDocument()
  })
})
