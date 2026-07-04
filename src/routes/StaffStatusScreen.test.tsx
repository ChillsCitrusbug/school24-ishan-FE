import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as staffApi from '@/features/staff/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
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

describe('StaffStatusScreen — deactivate', () => {
  it('shows the deactivate confirm and calls setStaffStatus(false) on confirm', async () => {
    vi.mocked(staffApi.getStaffDetail).mockResolvedValue(ACTIVE_STAFF)
    vi.mocked(staffApi.setStaffStatus).mockResolvedValue({ ...ACTIVE_STAFF, status: 'deactivated' })

    await renderAuthenticatedAt('/school-admin/staff/sp1/status')

    expect(await screen.findByText('Deactivate Sam Staff?')).toBeInTheDocument()
    expect(screen.getByText(/loses access immediately/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /deactivate & email/i }))

    await waitFor(() =>
      expect(vi.mocked(staffApi.setStaffStatus)).toHaveBeenCalledWith('sp1', false),
    )
  })

  it('Cancel returns to the staff detail screen without changing status', async () => {
    vi.mocked(staffApi.getStaffDetail).mockResolvedValue(ACTIVE_STAFF)

    await renderAuthenticatedAt('/school-admin/staff/sp1/status')
    await screen.findByText('Deactivate Sam Staff?')

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(await screen.findByText('Sam Staff')).toBeInTheDocument()
    expect(vi.mocked(staffApi.setStaffStatus)).not.toHaveBeenCalled()
  })

  it('shows an error banner when the status change fails', async () => {
    vi.mocked(staffApi.getStaffDetail).mockResolvedValue(ACTIVE_STAFF)
    vi.mocked(staffApi.setStaffStatus).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/staff/sp1/status')
    await screen.findByText('Deactivate Sam Staff?')

    fireEvent.click(screen.getByRole('button', { name: /deactivate & email/i }))

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })
})

describe('StaffStatusScreen — reactivate', () => {
  it('shows the reactivate confirm (also a confirm step, not a single click) and calls setStaffStatus(true) on confirm', async () => {
    const deactivatedStaff: staffApi.StaffDetail = { ...ACTIVE_STAFF, status: 'deactivated' }
    vi.mocked(staffApi.getStaffDetail).mockResolvedValue(deactivatedStaff)
    vi.mocked(staffApi.setStaffStatus).mockResolvedValue(ACTIVE_STAFF)

    await renderAuthenticatedAt('/school-admin/staff/sp1/status')

    expect(await screen.findByText('Reactivate Sam Staff?')).toBeInTheDocument()
    expect(screen.getByText(/will regain access to their granted modules/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /reactivate & email/i }))

    await waitFor(() =>
      expect(vi.mocked(staffApi.setStaffStatus)).toHaveBeenCalledWith('sp1', true),
    )
  })
})
