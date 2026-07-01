import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import { routes } from './index'

vi.mock('@/features/auth/api')

function renderRouterAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const view = render(
    <AuthProvider>
      <RouterProvider router={router} />
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
})
