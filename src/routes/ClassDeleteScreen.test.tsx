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

describe('ClassDeleteScreen', () => {
  it('shows the default destructive-confirm state for an empty class', async () => {
    vi.mocked(classesApi.getClass).mockResolvedValue({
      id: 'c1',
      label: 'Room 4B',
      student_count: 0,
    })

    await renderAuthenticatedAt('/school-admin/classes/c1/delete')

    expect(await screen.findByText('Delete Room 4B?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete class' })).toBeInTheDocument()
  })

  it('deletes an empty class and returns to the list (Scenario 3)', async () => {
    vi.mocked(classesApi.getClass).mockResolvedValue({
      id: 'c1',
      label: 'Room 4B',
      student_count: 0,
    })
    vi.mocked(classesApi.deleteClass).mockResolvedValue(undefined)
    vi.mocked(classesApi.listClasses).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/classes/c1/delete')
    await screen.findByText('Delete Room 4B?')
    fireEvent.click(screen.getByRole('button', { name: 'Delete class' }))

    await waitFor(() => expect(classesApi.deleteClass).toHaveBeenCalledWith('c1'))
    expect(await screen.findByText('No classes yet')).toBeInTheDocument()
  })

  it('cancelling does not call the API', async () => {
    vi.mocked(classesApi.getClass).mockResolvedValue({
      id: 'c1',
      label: 'Room 4B',
      student_count: 0,
    })
    // Cancel navigates back to the classes list, which mounts
    // ClassesListScreen and fetches for real — mock it too, else the
    // auto-mocked listClasses() returns undefined and .then() throws.
    vi.mocked(classesApi.listClasses).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/classes/c1/delete')
    await screen.findByText('Delete Room 4B?')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(await screen.findByText('No classes yet')).toBeInTheDocument()
    expect(classesApi.deleteClass).not.toHaveBeenCalled()
  })

  it('shows the blocked state when the class has enrolled students, with no delete button', async () => {
    vi.mocked(classesApi.getClass).mockResolvedValue({
      id: 'c1',
      label: 'Room 4B',
      student_count: 28,
    })

    await renderAuthenticatedAt('/school-admin/classes/c1/delete')

    expect(await screen.findByText("Can't delete this class")).toBeInTheDocument()
    expect(screen.getByText(/Room 4B has 28 students enrolled/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete class' })).not.toBeInTheDocument()
    expect(classesApi.deleteClass).not.toHaveBeenCalled()
  })

  it('"Move students" in the blocked state navigates to the class detail screen', async () => {
    vi.mocked(classesApi.getClass).mockResolvedValue({
      id: 'c1',
      label: 'Room 4B',
      student_count: 28,
    })
    vi.mocked(classesApi.listStudentsInClass).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/classes/c1/delete')
    await screen.findByText("Can't delete this class")
    fireEvent.click(screen.getByRole('button', { name: 'Move students' }))

    expect(await screen.findByText('28 students enrolled')).toBeInTheDocument()
  })

  it('shows an inline error if deletion is rejected by the backend (race condition)', async () => {
    vi.mocked(classesApi.getClass).mockResolvedValue({
      id: 'c1',
      label: 'Room 4B',
      student_count: 0,
    })
    vi.mocked(classesApi.deleteClass).mockRejectedValue({
      response: {
        data: { errors: 'This class has enrolled students. Move them to another class first, then delete it.' },
      },
    })

    await renderAuthenticatedAt('/school-admin/classes/c1/delete')
    await screen.findByText('Delete Room 4B?')
    fireEvent.click(screen.getByRole('button', { name: 'Delete class' }))

    expect(
      await screen.findByText(
        'This class has enrolled students. Move them to another class first, then delete it.',
      ),
    ).toBeInTheDocument()
  })
})
