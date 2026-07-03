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

const CLASS: classesApi.SchoolClass = { id: 'c1', label: 'Room 4B', student_count: 3 }

describe('ClassesListScreen', () => {
  it('renders each class row with its label and student count', async () => {
    vi.mocked(classesApi.listClasses).mockResolvedValue([CLASS])

    await renderAuthenticatedAt('/school-admin/classes')

    expect(await screen.findByText('Room 4B')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows the empty state with no classes', async () => {
    vi.mocked(classesApi.listClasses).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/classes')

    expect(await screen.findByText('No classes yet')).toBeInTheDocument()
  })

  it('shows an error state with a retry action when the fetch fails', async () => {
    vi.mocked(classesApi.listClasses).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/classes')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('the "Create class" button navigates to the class form', async () => {
    vi.mocked(classesApi.listClasses).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/classes')
    await screen.findByText('No classes yet')
    fireEvent.click(screen.getAllByRole('button', { name: /create class/i })[0])

    expect(await screen.findByText('Create a class')).toBeInTheDocument()
  })

  it('opening a row navigates to that class\'s detail screen', async () => {
    vi.mocked(classesApi.listClasses).mockResolvedValue([CLASS])
    vi.mocked(classesApi.getClass).mockResolvedValue(CLASS)
    vi.mocked(classesApi.listStudentsInClass).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/classes')
    await screen.findByText('Room 4B')
    fireEvent.click(screen.getByRole('button', { name: 'Open Room 4B' }))

    expect(await screen.findByText('3 students enrolled')).toBeInTheDocument()
    expect(classesApi.getClass).toHaveBeenCalledWith('c1')
  })

  it('the sidebar "Dashboard" link navigates for real (review finding, FR-011 round 1, Minor)', async () => {
    vi.mocked(classesApi.listClasses).mockResolvedValue([CLASS])

    await renderAuthenticatedAt('/school-admin/classes')
    await screen.findByText('Room 4B')
    fireEvent.click(screen.getByRole('link', { name: /dashboard/i }))

    expect(await screen.findByText(/Good morning/)).toBeInTheDocument()
  })
})
