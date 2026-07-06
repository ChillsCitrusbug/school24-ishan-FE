import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as notificationsApi from '@/features/notifications/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as studentAuthApi from '@/features/student-auth/api'
import { routes } from './index'

vi.mock('@/features/student-auth/api')
vi.mock('@/features/notifications/api')

async function loginAsStudent() {
  vi.mocked(studentAuthApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    student: { id: 's1', full_name: 'Noah Thompson', student_id: 'S-41880', school_id: 'sc1' },
  })
  const router = createMemoryRouter(routes, { initialEntries: ['/student-login'] })
  render(
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>,
  )
  fireEvent.change(screen.getByLabelText('Student ID'), { target: { value: 'S-41880' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText(/canteen home coming soon/i)).toBeInTheDocument())
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('StudentPlaceholderHome', () => {
  it("the topbar bell navigates to the student's own inbox (FR-044)", async () => {
    vi.mocked(notificationsApi.listMyNotifications).mockResolvedValue([])

    await loginAsStudent()
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    expect(await screen.findByText("You're all caught up")).toBeInTheDocument()
  })
})
