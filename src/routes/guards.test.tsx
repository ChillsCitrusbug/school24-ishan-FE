import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as studentAuthApi from '@/features/student-auth/api'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/student-auth/api')

function renderRouterAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const view = render(
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>,
  )
  return { router, ...view }
}

async function loginAs(role: 'school_admin' | 'parent') {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'token',
    token_type: 'bearer',
    user: {
      id: 'u1',
      full_name: 'Test User',
      email: 'test@example.com',
      role,
      school_id: role === 'school_admin' ? 's1' : null,
      school_name: role === 'school_admin' ? 'Greenvale Primary' : null,
    },
  })
  const view = renderRouterAt('/login')
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'x' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(authApi.login).toHaveBeenCalled())
  return view
}

async function loginAsStudent() {
  vi.mocked(studentAuthApi.login).mockResolvedValue({
    access_token: 'token',
    token_type: 'bearer',
    student: { id: 's1', full_name: 'Noah Thompson', student_id: 'S-41880', school_id: 'sc1' },
  })
  const view = renderRouterAt('/student-login')
  fireEvent.change(screen.getByLabelText('Student ID'), { target: { value: 'S-41880' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'x' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(studentAuthApi.login).toHaveBeenCalled())
  return view
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('RequireRole', () => {
  it('redirects to /login when there is no signed-in user', () => {
    renderRouterAt('/school-admin')

    expect(screen.getByText('Welcome back')).toBeInTheDocument()
  })

  it('redirects a signed-in user away from a route belonging to a different role', async () => {
    const { router } = await loginAs('parent')
    await waitFor(() => expect(screen.getByText(/dashboard coming soon/i)).toBeInTheDocument())

    // A parent session attempting to navigate to the School Admin route
    // must bounce back to the parent's own home, not render SA content.
    await act(async () => {
      await router.navigate('/school-admin')
    })

    await waitFor(() => expect(screen.getByText(/dashboard coming soon/i)).toBeInTheDocument())
    expect(screen.queryByText(/let.s set up your school/i)).not.toBeInTheDocument()
  })

  it('renders the real content when the signed-in role matches the route', async () => {
    await loginAs('school_admin')

    await waitFor(() => expect(screen.getByText(/let.s set up your school/i)).toBeInTheDocument())
  })
})

describe('RequireStudent', () => {
  it('redirects to /student-login when there is no signed-in student', () => {
    renderRouterAt('/student')

    expect(screen.getByText('Student sign in')).toBeInTheDocument()
  })

  it('renders the student home once a student session exists', async () => {
    await loginAsStudent()

    await waitFor(() =>
      expect(screen.getByText(/grab your usual in a tap/i)).toBeInTheDocument(),
    )
  })

  it('a signed-in user (not a student) is still bounced from /student', async () => {
    const { router } = await loginAs('parent')
    await waitFor(() => expect(screen.getByText(/dashboard coming soon/i)).toBeInTheDocument())

    // No student session exists just because a user is signed in — these
    // are two entirely separate identity contexts, so /student must still
    // redirect to /student-login, not render StudentPlaceholderHome.
    await act(async () => {
      await router.navigate('/student')
    })

    await waitFor(() => expect(screen.getByText('Student sign in')).toBeInTheDocument())
  })
})

describe('RootRedirect', () => {
  it('sends an unauthenticated visitor to /login', () => {
    renderRouterAt('/')

    expect(screen.getByText('Welcome back')).toBeInTheDocument()
  })

  it('sends a signed-in School Admin straight to their dashboard', async () => {
    const { router } = await loginAs('school_admin')
    await waitFor(() => expect(screen.getByText(/let.s set up your school/i)).toBeInTheDocument())

    await act(async () => {
      await router.navigate('/')
    })

    await waitFor(() => expect(screen.getByText(/let.s set up your school/i)).toBeInTheDocument())
  })

  it('sends a signed-in student straight to their home', async () => {
    const { router } = await loginAsStudent()
    await waitFor(() =>
      expect(screen.getByText(/grab your usual in a tap/i)).toBeInTheDocument(),
    )

    await act(async () => {
      await router.navigate('/')
    })

    await waitFor(() =>
      expect(screen.getByText(/grab your usual in a tap/i)).toBeInTheDocument(),
    )
  })
})
