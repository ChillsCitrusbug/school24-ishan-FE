import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as classesApi from '@/features/classes/api'
import * as studentsApi from '@/features/students/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/classes/api')
vi.mock('@/features/students/api')

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

const CLASS_A: classesApi.SchoolClass = { id: 'c1', label: 'Room 4B', student_count: 2 }
const STUDENT: studentsApi.Student = {
  id: 's1',
  student_id: 'S-40231',
  full_name: 'Liam Carter',
  class_id: 'c1',
  is_active: true,
}

describe('StudentDetailScreen', () => {
  it('loads and shows the student record', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(STUDENT)
    vi.mocked(classesApi.listClasses).mockResolvedValue([CLASS_A])

    await renderAuthenticatedAt('/school-admin/students/s1')

    expect(await screen.findByText('Liam Carter')).toBeInTheDocument()
    expect(screen.getAllByText('S-40231').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Room 4B').length).toBeGreaterThan(0)
  })

  it('only shows Edit details and Remove student actions', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(STUDENT)
    vi.mocked(classesApi.listClasses).mockResolvedValue([CLASS_A])

    await renderAuthenticatedAt('/school-admin/students/s1')
    await screen.findByText('Liam Carter')

    expect(screen.getByRole('button', { name: /edit details/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove student/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reset credential/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /manage guardians/i })).not.toBeInTheDocument()
  })

  it('"Edit details" navigates to the edit form', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(STUDENT)
    vi.mocked(classesApi.listClasses).mockResolvedValue([CLASS_A])

    await renderAuthenticatedAt('/school-admin/students/s1')
    await screen.findByText('Liam Carter')

    fireEvent.click(screen.getByRole('button', { name: /edit details/i }))

    expect(await screen.findByText('Edit student')).toBeInTheDocument()
  })

  it('"Remove student" navigates to the remove-confirmation screen', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(STUDENT)
    vi.mocked(classesApi.listClasses).mockResolvedValue([CLASS_A])

    await renderAuthenticatedAt('/school-admin/students/s1')
    await screen.findByText('Liam Carter')

    fireEvent.click(screen.getByRole('button', { name: /remove student/i }))

    expect(await screen.findByText('Remove Liam Carter?')).toBeInTheDocument()
  })

  it('shows an error banner when the student cannot be found', async () => {
    vi.mocked(studentsApi.getStudent).mockRejectedValue(new Error('Network Error'))
    vi.mocked(classesApi.listClasses).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/students/s1')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })
})
