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

describe('RoleBuilderScreen', () => {
  it('renders every fixed module row with its 4 operation checkboxes, all unchecked', async () => {
    await renderAuthenticatedAt('/school-admin/roles/new')

    for (const module of ['Approval', 'Order Management', 'Menu Management', 'Notification']) {
      for (const op of ['Listing', 'Add', 'Edit', 'Delete']) {
        const checkbox = screen.getByRole('checkbox', { name: `${module}: ${op}` })
        expect(checkbox).toHaveAttribute('aria-checked', 'false')
      }
    }
  })

  it('requires a role name before submitting, without calling the API', async () => {
    await renderAuthenticatedAt('/school-admin/roles/new')

    fireEvent.click(screen.getByRole('button', { name: /save role/i }))

    expect(await screen.findByText('Role name is required.')).toBeInTheDocument()
    expect(rolesApi.createRole).not.toHaveBeenCalled()
  })

  it('submits exactly the checked operations per module, independently', async () => {
    vi.mocked(rolesApi.createRole).mockResolvedValue({
      id: 'r1',
      name: 'Order Handler',
      staff_count: 0,
      permissions: [],
    })
    // A successful create navigates back to the roles list, which itself
    // calls listRoles() on mount — mocked here purely so that real,
    // expected navigation doesn't crash on an unmocked call; not the
    // focus of this test.
    vi.mocked(rolesApi.listRoles).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/roles/new')
    fireEvent.change(screen.getByLabelText('Role name'), { target: { value: 'Order Handler' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Order Management: Add' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Order Management: Listing' }))
    fireEvent.click(screen.getByRole('button', { name: /save role/i }))

    await waitFor(() => expect(rolesApi.createRole).toHaveBeenCalled())
    const [name, permissions] = vi.mocked(rolesApi.createRole).mock.calls[0]
    expect(name).toBe('Order Handler')
    const orderMgmt = permissions.find((p) => p.module === 'order_management')
    expect(orderMgmt).toEqual({
      module: 'order_management',
      can_add: true,
      can_edit: false,
      can_delete: false,
      can_list: true,
    })
    // Every other module submitted with nothing granted — no operation
    // implied beyond what was explicitly ticked.
    for (const other of permissions.filter((p) => p.module !== 'order_management')) {
      expect(other.can_add).toBe(false)
      expect(other.can_edit).toBe(false)
      expect(other.can_delete).toBe(false)
      expect(other.can_list).toBe(false)
    }
  })

  it('shows the backend error banner on a duplicate name (409) without navigating away', async () => {
    vi.mocked(rolesApi.createRole).mockRejectedValue({
      response: { status: 409, data: { errors: 'A role with this name already exists.' } },
    })

    await renderAuthenticatedAt('/school-admin/roles/new')
    fireEvent.change(screen.getByLabelText('Role name'), { target: { value: 'Cashier' } })
    fireEvent.click(screen.getByRole('button', { name: /save role/i }))

    expect(
      await screen.findByText('A role with this name already exists.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Role name')).toBeInTheDocument()
  })
})
