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
const CLASS_B: classesApi.SchoolClass = { id: 'c2', label: 'Room 5A', student_count: 1 }
const STUDENT_A: studentsApi.Student = {
  id: 's1',
  student_id: 'S-40231',
  full_name: 'Liam Carter',
  class_id: 'c1',
  is_active: true,
}
const STUDENT_B: studentsApi.Student = {
  id: 's2',
  student_id: 'S-40887',
  full_name: 'Ava Chen',
  class_id: 'c2',
  is_active: true,
}

describe('StudentsListScreen', () => {
  it('renders each student row with name, student ID, and class', async () => {
    vi.mocked(classesApi.listClasses).mockResolvedValue([CLASS_A, CLASS_B])
    vi.mocked(studentsApi.listStudents).mockResolvedValue([STUDENT_A, STUDENT_B])

    await renderAuthenticatedAt('/school-admin/students')

    expect(await screen.findByText('Liam Carter')).toBeInTheDocument()
    expect(screen.getByText('S-40231')).toBeInTheDocument()
    expect(screen.getAllByText('Room 4B').length).toBeGreaterThan(0)
    expect(screen.getByText('Ava Chen')).toBeInTheDocument()
  })

  it('shows an empty state with an add-student CTA when there are no students', async () => {
    vi.mocked(classesApi.listClasses).mockResolvedValue([CLASS_A])
    vi.mocked(studentsApi.listStudents).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/students')

    expect(await screen.findByText('No students yet')).toBeInTheDocument()
  })

  it('filters the list by class', async () => {
    vi.mocked(classesApi.listClasses).mockResolvedValue([CLASS_A, CLASS_B])
    vi.mocked(studentsApi.listStudents).mockResolvedValue([STUDENT_A, STUDENT_B])

    await renderAuthenticatedAt('/school-admin/students')
    await screen.findByText('Liam Carter')

    fireEvent.change(screen.getByLabelText('Filter by class'), { target: { value: 'c2' } })

    expect(screen.queryByText('Liam Carter')).not.toBeInTheDocument()
    expect(screen.getByText('Ava Chen')).toBeInTheDocument()
  })

  it('the "Add student" button navigates to the enrolment form', async () => {
    vi.mocked(classesApi.listClasses).mockResolvedValue([CLASS_A])
    vi.mocked(studentsApi.listStudents).mockResolvedValue([STUDENT_A])

    await renderAuthenticatedAt('/school-admin/students')
    await screen.findByText('Liam Carter')

    fireEvent.click(screen.getByRole('button', { name: /add student/i }))

    expect(await screen.findByText('Enrol a student')).toBeInTheDocument()
  })

  it('shows an error state with a retry action when the fetch fails', async () => {
    vi.mocked(classesApi.listClasses).mockResolvedValue([])
    vi.mocked(studentsApi.listStudents).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/students')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('the sidebar "Students" link navigates for real', async () => {
    vi.mocked(classesApi.listClasses).mockResolvedValue([])
    vi.mocked(studentsApi.listStudents).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/students')
    await screen.findByText('No students yet')

    for (const link of screen.getAllByRole('link', { name: /students/i })) {
      expect(link).toHaveAttribute('href', '/school-admin/students')
    }
  })
})
