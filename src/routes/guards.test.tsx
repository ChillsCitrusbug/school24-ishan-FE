import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
    await waitFor(() => expect(screen.getByText(/good morning/i)).toBeInTheDocument())

    // A parent session attempting to navigate to the School Admin route
    // must bounce back to the parent's own home, not render SA content.
    await act(async () => {
      await router.navigate('/school-admin')
    })

    await waitFor(() => expect(screen.getByText(/good morning/i)).toBeInTheDocument())
    expect(screen.queryByText(/let.s set up your school/i)).not.toBeInTheDocument()
  })

  it('renders the real content when the signed-in role matches the route', async () => {
    await loginAs('school_admin')

    await waitFor(() => expect(screen.getByText(/good morning/i)).toBeInTheDocument())
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
    await waitFor(() => expect(screen.getByText(/good morning/i)).toBeInTheDocument())

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
    await waitFor(() => expect(screen.getByText(/good morning/i)).toBeInTheDocument())

    await act(async () => {
      await router.navigate('/')
    })

    await waitFor(() => expect(screen.getByText(/good morning/i)).toBeInTheDocument())
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

describe('Logout (session-persistence addition, 2026-07-08)', () => {
  it('a signed-in user can log out from any authenticated screen and lands back on /login', async () => {
    await loginAs('school_admin')
    await waitFor(() => expect(screen.getByText(/good morning/i)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /log out/i }))

    await waitFor(() => expect(screen.getByText('Welcome back')).toBeInTheDocument())
    // A genuinely cleared session, not just a navigated-away screen —
    // going back to a protected route redirects to /login again.
    expect(sessionStorage.getItem('school24_access_token')).toBeNull()
  })

  it('a signed-in student can log out and lands back on /student-login', async () => {
    await loginAsStudent()
    await waitFor(() =>
      expect(screen.getByText(/grab your usual in a tap/i)).toBeInTheDocument(),
    )

    fireEvent.click(screen.getByRole('button', { name: /log out/i }))

    await waitFor(() => expect(screen.getByText('Student sign in')).toBeInTheDocument())
  })
})

describe('Sidebar brand title (clickable-home addition, 2026-07-08)', () => {
  it('navigates back to the role home from a nested screen', async () => {
    const { router } = await loginAs('school_admin')
    await waitFor(() => expect(screen.getByText(/good morning/i)).toBeInTheDocument())

    await act(async () => {
      await router.navigate('/school-admin/reports')
    })
    await waitFor(() => expect(screen.getByText('Operational reports')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('link', { name: /school24/i }))

    await waitFor(() => expect(screen.getByText(/good morning/i)).toBeInTheDocument())
  })
})

describe('Sidebar collapse/expand toggle (2026-07-08)', () => {
  it('collapsing the sidebar hides nav labels; expanding restores them', async () => {
    await loginAs('school_admin')
    await waitFor(() => expect(screen.getByText(/good morning/i)).toBeInTheDocument())
    // Scoped to the sidebar's own <aside> — MobileTabBar renders the
    // same "Students" label as a real <a> in the same jsdom tree (CSS
    // md:hidden doesn't remove it without a real layout engine), so an
    // unscoped query would always see two matches.
    const sidebar = within(screen.getByRole('complementary'))

    // The visible label text — a collapsed item keeps an accessible
    // name via `title` (so it's still findable/announceable), so this
    // checks the VISIBLE text disappears, not the accessible name.
    expect(sidebar.getByText('Students')).toBeInTheDocument()

    fireEvent.click(sidebar.getByRole('button', { name: /collapse sidebar/i }))

    expect(sidebar.queryByText('Students')).not.toBeInTheDocument()
    expect(sidebar.getByTitle('Students')).toBeInTheDocument()

    fireEvent.click(sidebar.getByRole('button', { name: /expand sidebar/i }))

    expect(await sidebar.findByText('Students')).toBeInTheDocument()
  })

  it('the collapsed state persists across a page navigation', async () => {
    const { router } = await loginAs('school_admin')
    await waitFor(() => expect(screen.getByText(/good morning/i)).toBeInTheDocument())
    const sidebar = within(screen.getByRole('complementary'))

    fireEvent.click(sidebar.getByRole('button', { name: /collapse sidebar/i }))
    expect(sidebar.queryByText('Students')).not.toBeInTheDocument()

    await act(async () => {
      await router.navigate('/school-admin/reports')
    })
    await waitFor(() => expect(screen.getByText('Operational reports')).toBeInTheDocument())
    // Re-scoped — Reports is a separate screen component with its own
    // <Sidebar>, so the earlier `sidebar` binding is a detached node.
    const newSidebar = within(screen.getByRole('complementary'))

    expect(newSidebar.queryByText('Reports')).not.toBeInTheDocument()
    expect(newSidebar.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument()
  })
})

describe('Session persistence across a refresh (2026-07-08)', () => {
  it('a persisted user token rehydrates the session without a login redirect', async () => {
    sessionStorage.setItem('school24_access_token', 'a-persisted-jwt')
    vi.mocked(authApi.getMe).mockResolvedValue({
      id: 'u1',
      full_name: 'Test User',
      email: 'test@example.com',
      role: 'school_admin',
      school_id: 's1',
      school_name: 'Greenvale Primary',
    })
    // The token belongs to this User session — StudentAuthProvider's
    // own concurrent boot check against the SAME token must 401 (a
    // real backend would reject a User token here), matching the
    // "at most one succeeds" contract this whole feature relies on.
    vi.mocked(studentAuthApi.getMe).mockRejectedValue({ response: { status: 401 } })

    renderRouterAt('/school-admin')

    // Never flashes the login screen while rehydration is in flight.
    expect(screen.queryByText('Welcome back')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText(/good morning/i)).toBeInTheDocument(),
    )
    expect(authApi.getMe).toHaveBeenCalled()
  })

  it('a persisted student token rehydrates the session without a login redirect', async () => {
    sessionStorage.setItem('school24_access_token', 'a-persisted-jwt')
    vi.mocked(studentAuthApi.getMe).mockResolvedValue({
      id: 's1',
      full_name: 'Noah Thompson',
      student_id: 'S-41880',
      school_id: 'sc1',
    })
    // The token belongs to this Student session — AuthProvider's own
    // concurrent boot check against the SAME token must 401.
    vi.mocked(authApi.getMe).mockRejectedValue({ response: { status: 401 } })

    renderRouterAt('/student')

    expect(screen.queryByText('Student sign in')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText(/grab your usual in a tap/i)).toBeInTheDocument(),
    )
  })

  it('an invalid/expired persisted token falls back to the login screen, not an infinite spinner', async () => {
    sessionStorage.setItem('school24_access_token', 'a-stale-jwt')
    vi.mocked(authApi.getMe).mockRejectedValue({ response: { status: 401 } })
    vi.mocked(studentAuthApi.getMe).mockRejectedValue({ response: { status: 401 } })

    renderRouterAt('/school-admin')

    await waitFor(() => expect(screen.getByText('Welcome back')).toBeInTheDocument())
  })
})
