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

  // --- FR-018: edit mode (same shared component, loaded via :roleId) ---

  it('loads an existing role and pre-fills its name and permission matrix', async () => {
    vi.mocked(rolesApi.getRole).mockResolvedValue({
      id: 'r1',
      name: 'Order Handler',
      staff_count: 2,
      permissions: [
        {
          module: 'order_management',
          can_add: true,
          can_edit: false,
          can_delete: false,
          can_list: true,
        },
        { module: 'approval', can_add: false, can_edit: false, can_delete: false, can_list: false },
        {
          module: 'menu_management',
          can_add: false,
          can_edit: false,
          can_delete: false,
          can_list: false,
        },
        { module: 'notification', can_add: false, can_edit: false, can_delete: false, can_list: false },
      ],
    })

    await renderAuthenticatedAt('/school-admin/roles/r1/edit')

    expect(await screen.findByText('Edit role')).toBeInTheDocument()
    expect(screen.getByLabelText('Role name')).toHaveValue('Order Handler')
    expect(screen.getByRole('checkbox', { name: 'Order Management: Add' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('checkbox', { name: 'Order Management: Listing' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('checkbox', { name: 'Approval: Add' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('submits an edit via updateRole, not createRole', async () => {
    vi.mocked(rolesApi.getRole).mockResolvedValue({
      id: 'r1',
      name: 'Cashier',
      staff_count: 0,
      permissions: [],
    })
    vi.mocked(rolesApi.updateRole).mockResolvedValue({
      id: 'r1',
      name: 'Senior Cashier',
      staff_count: 0,
      permissions: [],
    })
    vi.mocked(rolesApi.listRoles).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/roles/r1/edit')
    await screen.findByDisplayValue('Cashier')
    fireEvent.change(screen.getByLabelText('Role name'), { target: { value: 'Senior Cashier' } })
    fireEvent.click(screen.getByRole('button', { name: /save role/i }))

    await waitFor(() => expect(rolesApi.updateRole).toHaveBeenCalledWith('r1', 'Senior Cashier', expect.any(Array)))
    expect(rolesApi.createRole).not.toHaveBeenCalled()
  })

  it('shows an error and never renders the form when the role fails to load', async () => {
    vi.mocked(rolesApi.getRole).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/roles/r1/edit')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Role name')).not.toBeInTheDocument()
  })

  // Review finding, FR-018 (Minor): only the load-failure case and the
  // create-mode submit-failure case were directly tested — a failed
  // *edit* submit specifically (as opposed to a failed load, or a failed
  // create) was only inferred from shared code, not proven. This proves
  // it: the form (and the user's edited data) must survive a failed
  // save, distinct from a load failure which correctly hides the form.
  it('keeps the form visible with the user’s edited data when an edit submit fails', async () => {
    vi.mocked(rolesApi.getRole).mockResolvedValue({
      id: 'r1',
      name: 'Cashier',
      staff_count: 0,
      permissions: [],
    })
    vi.mocked(rolesApi.updateRole).mockRejectedValue({
      response: { status: 409, data: { errors: 'A role with this name already exists.' } },
    })

    await renderAuthenticatedAt('/school-admin/roles/r1/edit')
    await screen.findByDisplayValue('Cashier')
    fireEvent.change(screen.getByLabelText('Role name'), { target: { value: 'Manager' } })
    fireEvent.click(screen.getByRole('button', { name: /save role/i }))

    expect(
      await screen.findByText('A role with this name already exists.'),
    ).toBeInTheDocument()
    // The form is still there, with the user's own edit intact — not
    // reset, not hidden, unlike the load-failure case above.
    expect(screen.getByLabelText('Role name')).toHaveValue('Manager')
  })
})
