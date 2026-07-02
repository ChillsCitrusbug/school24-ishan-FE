import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as rolesApi from '@/features/roles/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
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

describe('RoleDeleteScreen', () => {
  it('shows the role name and no warning banner when no staff are assigned', async () => {
    vi.mocked(rolesApi.getRole).mockResolvedValue({
      id: 'r1',
      name: 'Canteen Staff',
      staff_count: 0,
      permissions: [],
    })

    await renderAuthenticatedAt('/school-admin/roles/r1/delete')

    expect(await screen.findByText('Delete the “Canteen Staff” role?')).toBeInTheDocument()
    expect(screen.queryByText(/currently have this role/)).not.toBeInTheDocument()
  })

  // EC-038's own approved design state ("assigned") — matches Sc039DeleteRole.tsx exactly.
  it('shows the staff-count warning when staff are currently assigned', async () => {
    vi.mocked(rolesApi.getRole).mockResolvedValue({
      id: 'r1',
      name: 'Canteen Staff',
      staff_count: 5,
      permissions: [],
    })

    await renderAuthenticatedAt('/school-admin/roles/r1/delete')

    expect(
      await screen.findByText(
        '5 staff currently have this role. They’ll lose all access until you assign them a new role.',
      ),
    ).toBeInTheDocument()
  })

  it('deletes the role and navigates back to the roles list on confirm', async () => {
    vi.mocked(rolesApi.getRole).mockResolvedValue({
      id: 'r1',
      name: 'Canteen Staff',
      staff_count: 0,
      permissions: [],
    })
    vi.mocked(rolesApi.deleteRole).mockResolvedValue(undefined)
    vi.mocked(rolesApi.listRoles).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/roles/r1/delete')
    await screen.findByText('Delete the “Canteen Staff” role?')
    fireEvent.click(screen.getByRole('button', { name: /^delete role$/i }))

    await waitFor(() => expect(rolesApi.deleteRole).toHaveBeenCalledWith('r1'))
    expect(await screen.findByText('Roles & permissions')).toBeInTheDocument()
  })

  it('shows an error banner and does not navigate away when delete fails', async () => {
    vi.mocked(rolesApi.getRole).mockResolvedValue({
      id: 'r1',
      name: 'Canteen Staff',
      staff_count: 0,
      permissions: [],
    })
    vi.mocked(rolesApi.deleteRole).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/roles/r1/delete')
    await screen.findByText('Delete the “Canteen Staff” role?')
    fireEvent.click(screen.getByRole('button', { name: /^delete role$/i }))

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Delete the “Canteen Staff” role?')).toBeInTheDocument()
  })
})
