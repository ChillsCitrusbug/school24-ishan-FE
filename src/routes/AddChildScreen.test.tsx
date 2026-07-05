import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as parentLinksApi from '@/features/parent-links/api'
import * as permissionsApi from '@/features/permissions/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/parent-links/api')
vi.mock('@/features/permissions/api')

const PARENT_USER = {
  id: 'u1',
  full_name: 'Sarah Thompson',
  email: 'sarah@thompson.com',
  role: 'parent' as const,
  school_id: null,
  school_name: null,
}

async function renderAuthenticatedAt(path: string) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user: PARENT_USER,
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
  await waitFor(() => expect(screen.getByText(/dashboard coming soon/i)).toBeInTheDocument())

  await act(async () => {
    await router.navigate(path)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AddChildScreen (Sc059AddChild)', () => {
  it('has an "Add a child" entry point on the Parent dashboard', async () => {
    await renderAuthenticatedAt('/parent')

    expect(screen.getByRole('link', { name: /add child/i })).toBeInTheDocument()
  })

  it('submits a Student ID and shows the pending-request success state', async () => {
    vi.mocked(parentLinksApi.requestChildLink).mockResolvedValue({
      id: 'l1',
      student_id: 's1',
      status: 'pending',
      student_full_name: 'Liam Thompson',
      student_id_code: 'S-40231',
    })

    await renderAuthenticatedAt('/parent/children/add')
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. S-40231/i), {
      target: { value: 'S-40231' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send link request/i }))

    expect(await screen.findByText('Request sent')).toBeInTheDocument()
    expect(screen.getByText('Liam Thompson · S-40231')).toBeInTheDocument()
    expect(screen.getByText('Pending school approval')).toBeInTheDocument()
    expect(vi.mocked(parentLinksApi.requestChildLink)).toHaveBeenCalledWith('S-40231')
  })

  it('shows the exact guardian-cap message when the request is rejected (409)', async () => {
    const capError = new Error('cap') as Error & { response: unknown }
    capError.response = {
      data: {
        errors: 'You are not able to get parent access for this student. Please contact admin.',
      },
    }
    vi.mocked(parentLinksApi.requestChildLink).mockRejectedValue(capError)

    await renderAuthenticatedAt('/parent/children/add')
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. S-40231/i), {
      target: { value: 'S-40231' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send link request/i }))

    expect(
      await screen.findByText(
        'You are not able to get parent access for this student. Please contact admin.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Request sent')).not.toBeInTheDocument()
  })

  it('shows a not-found message for an invalid Student ID', async () => {
    const notFoundError = new Error('nf') as Error & { response: unknown }
    notFoundError.response = {
      data: { errors: 'No student found with that Student ID. Double-check it with your school.' },
    }
    vi.mocked(parentLinksApi.requestChildLink).mockRejectedValue(notFoundError)

    await renderAuthenticatedAt('/parent/children/add')
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. S-40231/i), {
      target: { value: 'S-99999' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send link request/i }))

    expect(
      await screen.findByText(
        'No student found with that Student ID. Double-check it with your school.',
      ),
    ).toBeInTheDocument()
  })

  it('a non-parent role cannot reach this screen', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      access_token: 'a-real-jwt',
      token_type: 'bearer',
      user: { ...PARENT_USER, role: 'staff' as const, school_id: 's1', school_name: 'Greenvale' },
    })
    vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue([])
    const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
    render(
      <AuthProvider>
        <StudentAuthProvider>
          <RouterProvider router={router} />
        </StudentAuthProvider>
      </AuthProvider>,
    )
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'staff@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(authApi.login).toHaveBeenCalled())

    await act(async () => {
      await router.navigate('/parent/children/add')
    })

    expect(screen.queryByText('Add a child')).not.toBeInTheDocument()
  })
})
