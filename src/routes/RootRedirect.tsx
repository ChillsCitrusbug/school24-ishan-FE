import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { useStudentAuth } from '@/features/student-auth/useStudentAuth'
import { ROLE_HOME_PATH } from './roleHome'

/** `/` itself is never a real page — route to whichever identity is
 * signed in (a user session or a student session — never both at once in
 * practice), or to the main login if neither. Always true after a hard
 * refresh, since the access token lives in memory only. */
export function RootRedirect() {
  const { user } = useAuth()
  const { student } = useStudentAuth()

  if (user) {
    return <Navigate to={ROLE_HOME_PATH[user.role]} replace />
  }
  if (student) {
    return <Navigate to="/student" replace />
  }
  return <Navigate to="/login" replace />
}
