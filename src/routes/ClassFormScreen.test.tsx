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

describe('ClassFormScreen', () => {
  it('creates a class (Scenario 1)', async () => {
    vi.mocked(classesApi.createClass).mockResolvedValue({
      id: 'c1',
      label: 'Room 4B',
      student_count: 0,
    })
    // A successful save navigates back to the classes list, which mounts
    // ClassesListScreen and fetches for real — mock it too, else the
    // auto-mocked listClasses() returns undefined and .then() throws.
    vi.mocked(classesApi.listClasses).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/classes/new')
    await screen.findByText('Create a class')

    fireEvent.change(screen.getByLabelText('Class label'), { target: { value: 'Room 4B' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save class' }))

    await waitFor(() => expect(classesApi.createClass).toHaveBeenCalledWith({ label: 'Room 4B' }))
  })

  it('shows an inline error when the label is a duplicate', async () => {
    vi.mocked(classesApi.createClass).mockRejectedValue({
      response: { data: { errors: 'A class with this label already exists.' } },
    })

    await renderAuthenticatedAt('/school-admin/classes/new')
    await screen.findByText('Create a class')

    fireEvent.change(screen.getByLabelText('Class label'), { target: { value: 'Room 4B' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save class' }))

    expect(
      await screen.findByText('A class with this label already exists.'),
    ).toBeInTheDocument()
  })

  it('loads and edits an existing class label (Scenario 2)', async () => {
    vi.mocked(classesApi.getClass).mockResolvedValue({
      id: 'c1',
      label: 'Room 4B',
      student_count: 5,
    })
    vi.mocked(classesApi.updateClass).mockResolvedValue({
      id: 'c1',
      label: 'Room 5C',
      student_count: 5,
    })
    vi.mocked(classesApi.listClasses).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/classes/c1/edit')
    await screen.findByText('Edit class')

    const input = screen.getByLabelText('Class label') as HTMLInputElement
    expect(input.value).toBe('Room 4B')

    fireEvent.change(input, { target: { value: 'Room 5C' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save class' }))

    await waitFor(() =>
      expect(classesApi.updateClass).toHaveBeenCalledWith('c1', { label: 'Room 5C' }),
    )
  })
})
