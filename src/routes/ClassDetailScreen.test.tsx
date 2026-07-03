import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as classesApi from '@/features/classes/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/classes/api')

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

describe('ClassDetailScreen', () => {
  it('shows the enrolled students (Scenario 4)', async () => {
    vi.mocked(classesApi.getClass).mockResolvedValue({
      id: 'c1',
      label: 'Room 4B',
      student_count: 1,
    })
    vi.mocked(classesApi.listStudentsInClass).mockResolvedValue([
      { id: 'st1', student_id: 'S-00001', full_name: 'Noah Thompson' },
    ])

    await renderAuthenticatedAt('/school-admin/classes/c1')

    expect(await screen.findByText('Room 4B')).toBeInTheDocument()
    expect(screen.getByText('Noah Thompson')).toBeInTheDocument()
    expect(screen.getByText('S-00001')).toBeInTheDocument()
  })

  it('shows the empty state with no students enrolled', async () => {
    vi.mocked(classesApi.getClass).mockResolvedValue({
      id: 'c1',
      label: 'Room 4B',
      student_count: 0,
    })
    vi.mocked(classesApi.listStudentsInClass).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/classes/c1')

    expect(await screen.findByText('No students enrolled')).toBeInTheDocument()
  })

  it('shows an error state when the class cannot be found', async () => {
    vi.mocked(classesApi.getClass).mockRejectedValue(new Error('Network Error'))
    vi.mocked(classesApi.listStudentsInClass).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/classes/c1')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('the Edit button navigates to the class form', async () => {
    vi.mocked(classesApi.getClass).mockResolvedValue({
      id: 'c1',
      label: 'Room 4B',
      student_count: 0,
    })
    vi.mocked(classesApi.listStudentsInClass).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/classes/c1')
    await screen.findByText('Room 4B')
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(await screen.findByText('Edit class')).toBeInTheDocument()
  })

  it('the Delete button navigates to the delete-confirm screen', async () => {
    vi.mocked(classesApi.getClass).mockResolvedValue({
      id: 'c1',
      label: 'Room 4B',
      student_count: 0,
    })
    vi.mocked(classesApi.listStudentsInClass).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/classes/c1')
    await screen.findByText('Room 4B')
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Delete Room 4B?')).toBeInTheDocument()
  })
})
