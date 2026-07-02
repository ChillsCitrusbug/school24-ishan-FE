import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as rolesApi from '@/features/roles/api'
import * as staffApi from '@/features/staff/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/roles/api')
vi.mock('@/features/staff/api')

const SCHOOL_ADMIN_USER = {
  id: 'u1',
  full_name: 'Priya Nair',
  email: 'priya@example.com',
  role: 'school_admin' as const,
  school_id: 's1',
  school_name: 'Greenvale Primary',
}

async function renderAuthenticatedAt(path: string) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user: SCHOOL_ADMIN_USER,
  })
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
  const result = render(
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
  return result
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AssignRoleScreen', () => {
  it('shows the target staff member’s real name, not a placeholder', async () => {
    vi.mocked(staffApi.getStaffSummary).mockResolvedValue({
      staff_profile_id: 'sp1',
      full_name: 'Jordan Lee',
      assigned_role_id: null,
    })
    vi.mocked(rolesApi.listRoles).mockResolvedValue([
      { id: 'r1', name: 'Canteen Staff', staff_count: 1, permissions: [] },
    ])

    await renderAuthenticatedAt('/school-admin/staff/sp1/assign-role')

    expect(await screen.findByText('Choose the role for Jordan Lee. It applies immediately.')).toBeInTheDocument()
  })

  it('shows the empty state when no roles exist yet', async () => {
    vi.mocked(staffApi.getStaffSummary).mockResolvedValue({
      staff_profile_id: 'sp1',
      full_name: 'Jordan Lee',
      assigned_role_id: null,
    })
    vi.mocked(rolesApi.listRoles).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/staff/sp1/assign-role')

    expect(
      await screen.findByText('No roles exist yet. Create a role first, then assign it.'),
    ).toBeInTheDocument()
  })

  it('pre-selects the staff member’s currently assigned role', async () => {
    vi.mocked(staffApi.getStaffSummary).mockResolvedValue({
      staff_profile_id: 'sp1',
      full_name: 'Jordan Lee',
      assigned_role_id: 'r2',
    })
    vi.mocked(rolesApi.listRoles).mockResolvedValue([
      { id: 'r1', name: 'Approver', staff_count: 1, permissions: [] },
      { id: 'r2', name: 'Canteen Staff', staff_count: 5, permissions: [] },
    ])

    await renderAuthenticatedAt('/school-admin/staff/sp1/assign-role')
    await screen.findByText('Canteen Staff')

    expect(screen.getByRole('radio', { name: /Canteen Staff/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: /Approver/ })).toHaveAttribute('aria-checked', 'false')
  })

  it('assigns the selected role and navigates back to the roles list', async () => {
    vi.mocked(staffApi.getStaffSummary).mockResolvedValue({
      staff_profile_id: 'sp1',
      full_name: 'Jordan Lee',
      assigned_role_id: null,
    })
    vi.mocked(rolesApi.listRoles).mockResolvedValue([
      { id: 'r1', name: 'Canteen Staff', staff_count: 1, permissions: [] },
    ])
    vi.mocked(staffApi.assignRole).mockResolvedValue(undefined)

    await renderAuthenticatedAt('/school-admin/staff/sp1/assign-role')
    await screen.findByText('Canteen Staff')
    fireEvent.click(screen.getByRole('radio', { name: /Canteen Staff/ }))
    fireEvent.click(screen.getByRole('button', { name: /^assign role$/i }))

    await waitFor(() => expect(staffApi.assignRole).toHaveBeenCalledWith('sp1', 'r1'))
    expect(await screen.findByText('Roles & permissions')).toBeInTheDocument()
  })

  it('shows the backend error banner on a cross-school assignment (422) without navigating away', async () => {
    vi.mocked(staffApi.getStaffSummary).mockResolvedValue({
      staff_profile_id: 'sp1',
      full_name: 'Jordan Lee',
      assigned_role_id: null,
    })
    vi.mocked(rolesApi.listRoles).mockResolvedValue([
      { id: 'r1', name: 'Canteen Staff', staff_count: 1, permissions: [] },
    ])
    vi.mocked(staffApi.assignRole).mockRejectedValue({
      response: {
        status: 422,
        data: { errors: 'This role and staff member must belong to the same school.' },
      },
    })

    await renderAuthenticatedAt('/school-admin/staff/sp1/assign-role')
    await screen.findByText('Canteen Staff')
    fireEvent.click(screen.getByRole('radio', { name: /Canteen Staff/ }))
    fireEvent.click(screen.getByRole('button', { name: /^assign role$/i }))

    expect(
      await screen.findByText('This role and staff member must belong to the same school.'),
    ).toBeInTheDocument()
  })
})
