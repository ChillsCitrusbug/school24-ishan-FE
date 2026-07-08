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

const PARENT_USER = {
  id: 'u1',
  full_name: 'Sarah Thompson',
  email: 'sarah@thompson.com',
  role: 'parent' as const,
  school_id: null,
  school_name: null,
}

afterEach(() => {
  vi.restoreAllMocks()
})

/** Smoke test only — shared behavior is exhaustively covered once,
 * against PaProfileScreen. Confirms Parent's own role-specific wiring
 * (empty nav groups, since no parentNav.ts exists yet) renders without
 * error. */
describe('ParentProfileScreen', () => {
  it('renders the Parent profile with its own role-specific notification labels', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      access_token: 'a-real-jwt',
      token_type: 'bearer',
      user: PARENT_USER,
    })
    vi.mocked(profileApi.getProfile).mockResolvedValue({
      id: 'u1',
      full_name: 'Sarah Thompson',
      email: 'sarah@thompson.com',
      mobile: '0412 987 654',
      role: 'parent',
    })

    const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
    render(
      <AuthProvider>
        <StudentAuthProvider>
          <RouterProvider router={router} />
        </StudentAuthProvider>
      </AuthProvider>,
    )
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: PARENT_USER.email } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(screen.getByText(/good morning/i)).toBeInTheDocument())

    await act(async () => {
      await router.navigate('/parent/profile')
    })

    expect(await screen.findByText('sarah@thompson.com')).toBeInTheDocument()
    expect(screen.getByText('0412 987 654')).toBeInTheDocument()
    expect(screen.getByText('Order updates')).toBeInTheDocument()
  })
})
