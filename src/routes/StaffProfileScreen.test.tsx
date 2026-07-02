import { fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as permissionsApi from '@/features/permissions/api'
import * as profileApi from '@/features/profile/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/permissions/api')
vi.mock('@/features/profile/api')

const STAFF_USER = {
  id: 'u1',
  full_name: 'Jordan Lee',
  email: 'jordan.lee@greenvale.edu.au',
  role: 'staff' as const,
  school_id: 's1',
  school_name: 'Greenvale Primary',
}

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * Smoke test only — shared behavior is exhaustively covered once,
 * against PaProfileScreen. Confirms Staff's own role-specific wiring
 * renders, and that no fabricated "Staff ID" row is shown (there is no
 * such column on staff_profiles — see StaffProfileScreen.tsx's own
 * docstring).
 */
describe('StaffProfileScreen', () => {
  it('renders the Staff profile with its own role-specific notification labels, no fabricated Staff ID row', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      access_token: 'a-real-jwt',
      token_type: 'bearer',
      user: STAFF_USER,
    })
    vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue([])
    vi.mocked(profileApi.getProfile).mockResolvedValue({
      id: 'u1',
      full_name: 'Jordan Lee',
      email: 'jordan.lee@greenvale.edu.au',
      mobile: '0412 345 678',
      role: 'staff',
    })

    const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
    render(
      <AuthProvider>
        <StudentAuthProvider>
          <RouterProvider router={router} />
        </StudentAuthProvider>
      </AuthProvider>,
    )
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: STAFF_USER.email } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(screen.getByText(/welcome/i)).toBeInTheDocument())

    await act(async () => {
      await router.navigate('/staff/profile')
    })

    expect(await screen.findByText('jordan.lee@greenvale.edu.au')).toBeInTheDocument()
    expect(screen.getByText('New order alerts')).toBeInTheDocument()
    expect(screen.queryByText('Staff ID')).not.toBeInTheDocument()
  })
})
