import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as staffApi from '@/features/staff/api'
import * as rolesApi from '@/features/roles/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/staff/api')
vi.mock('@/features/roles/api')

const SCHOOL_ADMIN_USER = {
  id: 'u1',
  full_name: 'Priya Nair',
  email: 'priya@example.com',
  role: 'school_admin' as const,
  school_id: 's1',
  school_name: 'Greenvale Primary',
}

const ACTIVE_STAFF: staffApi.StaffDetail = {
  staff_profile_id: 'sp1',
  full_name: 'Sam Staff',
  email: 'sam@school24.example',
  mobile: '+1-555-0199',
  position: 'Kitchen Assistant',
  department: 'Food Services',
  assigned_role_id: 'r1',
  role_name: 'Cashier',
  status: 'active',
}

async function renderAuthenticatedAt(path: string) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user: SCHOOL_ADMIN_USER,
  })
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
  render(
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>,
  )
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'priya@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText(/Good morning/)).toBeInTheDocument())

  await act(async () => {
    await router.navigate(path)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('StaffDetailScreen', () => {
  it('loads and shows the staff member record', async () => {
    vi.mocked(staffApi.getStaffDetail).mockResolvedValue(ACTIVE_STAFF)

    await renderAuthenticatedAt('/school-admin/staff/sp1')

    expect(await screen.findByText('Sam Staff')).toBeInTheDocument()
    // The email renders twice (header subtitle + "Email" InfoRow) — both real, expected.
    expect(screen.getAllByText('sam@school24.example')).toHaveLength(2)
    expect(screen.getByText('Cashier')).toBeInTheDocument()
    expect(screen.getByText('Food Services')).toBeInTheDocument()
    expect(staffApi.getStaffDetail).toHaveBeenCalledWith('sp1')
  })

  it('shows a pending-invite banner and a disabled resend button for a pending staff member', async () => {
    vi.mocked(staffApi.getStaffDetail).mockResolvedValue({ ...ACTIVE_STAFF, status: 'pending' })

    await renderAuthenticatedAt('/school-admin/staff/sp1')

    expect(await screen.findByText(/hasn.t accepted their invite/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resend invite' })).toBeDisabled()
  })

  it('shows a deactivated banner and a disabled reactivate button for a deactivated staff member', async () => {
    vi.mocked(staffApi.getStaffDetail).mockResolvedValue({ ...ACTIVE_STAFF, status: 'deactivated' })

    await renderAuthenticatedAt('/school-admin/staff/sp1')

    expect(await screen.findByText(/is deactivated and has no access/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reactivate' })).toBeDisabled()
  })

  it('shows an error state when the load fails', async () => {
    vi.mocked(staffApi.getStaffDetail).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/staff/sp1')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('the Edit details button navigates to the staff form', async () => {
    vi.mocked(staffApi.getStaffDetail).mockResolvedValue(ACTIVE_STAFF)
    vi.mocked(rolesApi.listRoles).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/staff/sp1')
    await screen.findByText('Sam Staff')
    fireEvent.click(screen.getByRole('button', { name: 'Edit details' }))

    expect(await screen.findByText('Edit staff member')).toBeInTheDocument()
  })

  it('the Assign role button navigates to the existing assign-role screen', async () => {
    vi.mocked(staffApi.getStaffDetail).mockResolvedValue(ACTIVE_STAFF)
    vi.mocked(staffApi.getStaffSummary).mockResolvedValue({
      staff_profile_id: 'sp1',
      full_name: 'Sam Staff',
      assigned_role_id: 'r1',
    })
    vi.mocked(rolesApi.listRoles).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/staff/sp1')
    await screen.findByText('Sam Staff')
    fireEvent.click(screen.getByRole('button', { name: 'Assign role' }))

    expect(await screen.findByText('Assign a role')).toBeInTheDocument()
  })
})
