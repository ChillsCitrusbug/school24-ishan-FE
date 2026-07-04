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

describe('StudentFormScreen — create (Sc029Enrol)', () => {
  it('enrols a student and shows the generated Student ID + temp password once', async () => {
    vi.mocked(classesApi.listClasses).mockResolvedValue([CLASS_A, CLASS_B])
    vi.mocked(studentsApi.createStudent).mockResolvedValue({
      id: 's1',
      student_id: 'S-40231',
      full_name: 'Liam Carter',
      class_id: 'c1',
      is_active: true,
      temp_password: 'Gv5-rk8t',
    })

    await renderAuthenticatedAt('/school-admin/students/new')
    await screen.findByText('Enrol a student')

    fireEvent.change(screen.getByLabelText('Student name'), { target: { value: 'Liam Carter' } })
    fireEvent.click(screen.getByRole('button', { name: /enrol student/i }))

    expect(await screen.findByText('Student enrolled')).toBeInTheDocument()
    expect(screen.getByText('S-40231')).toBeInTheDocument()
    expect(screen.getByText('Gv5-rk8t')).toBeInTheDocument()
    expect(vi.mocked(studentsApi.createStudent)).toHaveBeenCalledWith({
      full_name: 'Liam Carter',
      class_id: 'c1',
    })
  })

  it('"Enrol another" resets the form back to a blank enrolment', async () => {
    vi.mocked(classesApi.listClasses).mockResolvedValue([CLASS_A])
    vi.mocked(studentsApi.createStudent).mockResolvedValue({
      id: 's1',
      student_id: 'S-40231',
      full_name: 'Liam Carter',
      class_id: 'c1',
      is_active: true,
      temp_password: 'Gv5-rk8t',
    })

    await renderAuthenticatedAt('/school-admin/students/new')
    await screen.findByText('Enrol a student')
    fireEvent.change(screen.getByLabelText('Student name'), { target: { value: 'Liam Carter' } })
    fireEvent.click(screen.getByRole('button', { name: /enrol student/i }))
    await screen.findByText('Student enrolled')

    fireEvent.click(screen.getByRole('button', { name: /enrol another/i }))

    expect(await screen.findByText('Enrol a student')).toBeInTheDocument()
    expect(screen.getByLabelText('Student name')).toHaveValue('')
  })

  it('shows a validation error banner when the create call fails', async () => {
    vi.mocked(classesApi.listClasses).mockResolvedValue([CLASS_A])
    vi.mocked(studentsApi.createStudent).mockRejectedValue({
      response: { data: { errors: 'Class not found.' } },
    })

    await renderAuthenticatedAt('/school-admin/students/new')
    await screen.findByText('Enrol a student')
    fireEvent.change(screen.getByLabelText('Student name'), { target: { value: 'Liam Carter' } })
    fireEvent.click(screen.getByRole('button', { name: /enrol student/i }))

    expect(await screen.findByText('Class not found.')).toBeInTheDocument()
  })
})

describe('StudentFormScreen — edit (Sc030EditStudent)', () => {
  it('prefills and saves changes, leaving the Student ID unchanged', async () => {
    vi.mocked(classesApi.listClasses).mockResolvedValue([CLASS_A, CLASS_B])
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      id: 's1',
      student_id: 'S-40231',
      full_name: 'Liam Carter',
      class_id: 'c1',
      is_active: true,
    })
    vi.mocked(studentsApi.updateStudent).mockResolvedValue({
      id: 's1',
      student_id: 'S-40231',
      full_name: 'Liam Updated',
      class_id: 'c2',
      is_active: true,
    })

    await renderAuthenticatedAt('/school-admin/students/s1/edit')

    expect(await screen.findByDisplayValue('Liam Carter')).toBeInTheDocument()
    expect(
      screen.getByText('Student ID is permanent and can’t be changed.'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Student name'), {
      target: { value: 'Liam Updated' },
    })
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'c2' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(vi.mocked(studentsApi.updateStudent)).toHaveBeenCalledWith('s1', {
        full_name: 'Liam Updated',
        class_id: 'c2',
      }),
    )
  })
})
