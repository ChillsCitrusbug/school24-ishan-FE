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

const STUDENT: studentsApi.Student = {
  id: 's1',
  student_id: 'S-40231',
  full_name: 'Liam Carter',
  class_id: 'c1',
  is_active: true,
}

describe('StudentDeleteScreen', () => {
  it('shows a single confirm state (no "blocked" variant) and removes on confirm', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(STUDENT)
    vi.mocked(studentsApi.removeStudent).mockResolvedValue(undefined)
    vi.mocked(studentsApi.listStudents).mockResolvedValue([])
    vi.mocked(classesApi.listClasses).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/students/s1/delete')

    expect(await screen.findByText('Remove Liam Carter?')).toBeInTheDocument()
    expect(
      screen.getByText(/permanently removes the student and their record/i),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /remove student/i }))

    await waitFor(() => expect(vi.mocked(studentsApi.removeStudent)).toHaveBeenCalledWith('s1'))
  })

  it('Cancel returns to the students list without removing', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(STUDENT)
    vi.mocked(studentsApi.listStudents).mockResolvedValue([STUDENT])
    vi.mocked(classesApi.listClasses).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/students/s1/delete')
    await screen.findByText('Remove Liam Carter?')

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(await screen.findByRole('button', { name: /add student/i })).toBeInTheDocument()
    expect(vi.mocked(studentsApi.removeStudent)).not.toHaveBeenCalled()
  })

  it('shows an error banner when removal fails', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(STUDENT)
    vi.mocked(studentsApi.removeStudent).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/students/s1/delete')
    await screen.findByText('Remove Liam Carter?')

    fireEvent.click(screen.getByRole('button', { name: /remove student/i }))

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })
})
