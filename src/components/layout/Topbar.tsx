import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '../molecules/Input'
import { IconButton } from '../molecules/IconButton'
import { useAuth } from '@/features/auth/useAuth'
import { useStudentAuth } from '@/features/student-auth/useStudentAuth'

/**
 * Top app bar — search + a right-aligned action slot + a Logout button
 * (session-persistence addition, 2026-07-08: added here rather than
 * threading a callback through every screen's own `<Topbar right=.../>`
 * call, since both auth contexts always wrap the whole app — see
 * `App.tsx` — so this component can resolve "which session is active"
 * and call the right `logout()` itself). Navigation lives in the
 * sidebar/bottom tabs; Logout is the one exception, since it must be
 * reachable from every authenticated screen regardless of role.
 */
export function Topbar({
  searchPlaceholder = 'Search…',
  right,
}: {
  searchPlaceholder?: string
  right?: ReactNode
}) {
  const navigate = useNavigate()
  const { user, logout: logoutUser } = useAuth()
  const { student, logout: logoutStudent } = useStudentAuth()

  function handleLogout() {
    if (student) {
      logoutStudent()
      navigate('/student-login', { replace: true })
    } else {
      logoutUser()
      navigate('/login', { replace: true })
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white px-4 sm:gap-4 sm:px-6">
      <Input leadingIcon="search" placeholder={searchPlaceholder} className="max-w-md flex-1" aria-label="Search" />
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {right}
        {(user || student) && (
          <IconButton icon="logout" label="Log out" onClick={handleLogout} />
        )}
      </div>
    </header>
  )
}
