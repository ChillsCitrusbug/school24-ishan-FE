import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { ROLE_HOME_PATH } from './roleHome'

/** `/` itself is never a real page — route to the signed-in role's home,
 * or to login if there's no session (always true after a hard refresh,
 * since the access token lives in memory only). */
export function RootRedirect() {
  const { user } = useAuth()
  return <Navigate to={user ? ROLE_HOME_PATH[user.role] : '/login'} replace />
}
