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

const ROLE: rolesApi.Role = { id: 'r1', name: 'Cashier', staff_count: 0, permissions: [] }

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

describe('StaffFormScreen', () => {
  it('creates a staff member without a role and shows the "assign a role now" prompt (Scenario 2)', async () => {
    vi.mocked(rolesApi.listRoles).mockResolvedValue([ROLE])
    vi.mocked(staffApi.createStaff).mockResolvedValue({
      staff_profile_id: 'sp1',
      full_name: 'Ben Whitlock',
      email: 'ben@school24.example',
      mobile: null,
      position: 'Canteen Assistant',
      department: null,
      assigned_role_id: null,
      role_name: null,
      status: 'pending',
    })

    await renderAuthenticatedAt('/school-admin/staff/new')
    await screen.findByText('Add a staff member')

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Ben Whitlock' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ben@school24.example' } })
    fireEvent.change(screen.getByLabelText('Position'), { target: { value: 'Canteen Assistant' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send invite' }))

    await waitFor(() =>
      expect(staffApi.createStaff).toHaveBeenCalledWith({
        full_name: 'Ben Whitlock',
        email: 'ben@school24.example',
        mobile: null,
        position: 'Canteen Assistant',
        department: null,
        role_id: null,
      }),
    )
    expect(await screen.findByText('Invite sent')).toBeInTheDocument()
    expect(
      screen.getByText(/No role assigned yet/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Assign a role now' })).toBeInTheDocument()
  })

  it('creates a staff member with a role, no "assign a role now" prompt', async () => {
    vi.mocked(rolesApi.listRoles).mockResolvedValue([ROLE])
    vi.mocked(staffApi.createStaff).mockResolvedValue({
      staff_profile_id: 'sp1',
      full_name: 'Ben Whitlock',
      email: 'ben@school24.example',
      mobile: null,
      position: 'Canteen Assistant',
      department: null,
      assigned_role_id: 'r1',
      role_name: 'Cashier',
      status: 'pending',
    })

    await renderAuthenticatedAt('/school-admin/staff/new')
    await screen.findByText('Add a staff member')

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Ben Whitlock' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ben@school24.example' } })
    fireEvent.change(screen.getByLabelText('Position'), { target: { value: 'Canteen Assistant' } })
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'r1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send invite' }))

    await waitFor(() => expect(staffApi.createStaff).toHaveBeenCalled())
    expect(await screen.findByText('Invite sent')).toBeInTheDocument()
    expect(screen.queryByText(/No role assigned yet/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Assign a role now' })).not.toBeInTheDocument()
  })

  it('shows an inline error when the email is a duplicate', async () => {
    vi.mocked(rolesApi.listRoles).mockResolvedValue([])
    vi.mocked(staffApi.createStaff).mockRejectedValue({
      response: { data: { errors: 'A staff member with this email already exists. Use a different email.' } },
    })

    await renderAuthenticatedAt('/school-admin/staff/new')
    await screen.findByText('Add a staff member')

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Ben Whitlock' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ben@school24.example' } })
    fireEvent.change(screen.getByLabelText('Position'), { target: { value: 'Canteen Assistant' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send invite' }))

    expect(
      await screen.findByText('A staff member with this email already exists. Use a different email.'),
    ).toBeInTheDocument()
  })

  it('loads and edits an existing staff member (Scenario 3)', async () => {
    vi.mocked(rolesApi.listRoles).mockResolvedValue([])
    vi.mocked(staffApi.getStaffDetail).mockResolvedValue({
      staff_profile_id: 'sp1',
      full_name: 'Sam Staff',
      email: 'sam@school24.example',
      mobile: '+1-555-0199',
      position: 'Cashier',
      department: 'Canteen',
      assigned_role_id: 'r1',
      role_name: 'Cashier',
      status: 'active',
    })
    vi.mocked(staffApi.updateStaff).mockResolvedValue({
      staff_profile_id: 'sp1',
      full_name: 'Sam Staff Renamed',
      email: 'sam@school24.example',
      mobile: '+1-555-0199',
      position: 'Head Cashier',
      department: 'Canteen',
      assigned_role_id: 'r1',
      role_name: 'Cashier',
      status: 'active',
    })
    // A successful save navigates back to the staff list, which mounts
    // StaffListScreen and fetches for real — mock it too, else the
    // auto-mocked listStaff() returns undefined and .then() throws.
    vi.mocked(staffApi.listStaff).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/staff/sp1/edit')
    await screen.findByText('Edit staff member')

    const nameInput = screen.getByLabelText('Full name') as HTMLInputElement
    expect(nameInput.value).toBe('Sam Staff')
    // Edit mode has no Role field — assignment stays on its own screen.
    expect(screen.queryByLabelText('Role')).not.toBeInTheDocument()

    fireEvent.change(nameInput, { target: { value: 'Sam Staff Renamed' } })
    fireEvent.change(screen.getByLabelText('Position'), { target: { value: 'Head Cashier' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(staffApi.updateStaff).toHaveBeenCalledWith('sp1', {
        full_name: 'Sam Staff Renamed',
        email: 'sam@school24.example',
        mobile: '+1-555-0199',
        position: 'Head Cashier',
        department: 'Canteen',
      }),
    )
  })
})
