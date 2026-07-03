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

const STAFF_ITEM: staffApi.StaffListItem = {
  staff_profile_id: 'sp1',
  full_name: 'Sam Staff',
  email: 'sam@school24.example',
  role_name: 'Cashier',
  status: 'active',
}

const STAFF_DETAIL: staffApi.StaffDetail = {
  staff_profile_id: 'sp1',
  full_name: 'Sam Staff',
  email: 'sam@school24.example',
  mobile: null,
  position: 'Cashier',
  department: null,
  assigned_role_id: 'r1',
  role_name: 'Cashier',
  status: 'active',
}

describe('StaffListScreen', () => {
  it('renders each staff row with role and status', async () => {
    vi.mocked(staffApi.listStaff).mockResolvedValue([STAFF_ITEM])

    await renderAuthenticatedAt('/school-admin/staff')

    expect(await screen.findByText('Sam Staff')).toBeInTheDocument()
    expect(screen.getByText('sam@school24.example')).toBeInTheDocument()
    expect(screen.getByText('Cashier')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('a staff member with no role shows a dash', async () => {
    vi.mocked(staffApi.listStaff).mockResolvedValue([{ ...STAFF_ITEM, role_name: null }])

    await renderAuthenticatedAt('/school-admin/staff')

    await screen.findByText('Sam Staff')
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows the empty state with no staff', async () => {
    vi.mocked(staffApi.listStaff).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/staff')

    expect(await screen.findByText('No staff yet')).toBeInTheDocument()
  })

  it('shows an error state with a retry action when the fetch fails', async () => {
    vi.mocked(staffApi.listStaff).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/staff')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('the "Add staff" button navigates to the staff form', async () => {
    vi.mocked(staffApi.listStaff).mockResolvedValue([])
    vi.mocked(rolesApi.listRoles).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/staff')
    await screen.findByText('No staff yet')
    fireEvent.click(screen.getAllByRole('button', { name: /add staff/i })[0])

    expect(await screen.findByText('Add a staff member')).toBeInTheDocument()
  })

  it('opening a row navigates to that staff member\'s detail screen', async () => {
    vi.mocked(staffApi.listStaff).mockResolvedValue([STAFF_ITEM])
    vi.mocked(staffApi.getStaffDetail).mockResolvedValue(STAFF_DETAIL)

    await renderAuthenticatedAt('/school-admin/staff')
    await screen.findByText('Sam Staff')
    fireEvent.click(screen.getByRole('button', { name: 'Open Sam Staff' }))

    expect(await screen.findByText('Record')).toBeInTheDocument()
    expect(staffApi.getStaffDetail).toHaveBeenCalledWith('sp1')
  })

  it('the sidebar "Staff" link navigates for real', async () => {
    vi.mocked(staffApi.listStaff).mockResolvedValue([STAFF_ITEM])

    await renderAuthenticatedAt('/school-admin/staff')
    await screen.findByText('Sam Staff')

    expect(screen.getByRole('link', { name: /staff/i })).toHaveAttribute(
      'href',
      '/school-admin/staff',
    )
  })
})
