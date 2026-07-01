import axios, { type AxiosError } from 'axios'
import { clearAccessToken, getAccessToken } from '@/lib/auth-token'

/**
 * Centralized Axios client.
 *
 * Structure only — no feature endpoints live here. Each feature's
 * `api.ts` imports this instance and adds its own request functions.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach the in-memory access token, if present. Tokens are never read
// from localStorage — see src/lib/auth-token.ts.
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * FR-001 / EC-034: a session that expires (or is otherwise invalidated —
 * deactivated mid-session, etc.) mid-workflow must reject the in-flight
 * action and redirect to re-authenticate, never leave the user stuck
 * against a dead token. A 401 on any call OTHER than the login endpoint
 * itself (login's own 401 is a normal "wrong credentials" form error, not
 * a session-expiry event) clears the token and sends the user to the
 * session-expired system page (SC-012).
 *
 * A full page navigation (not a router push) is deliberate: this runs
 * outside the React tree, and a hard reload also guarantees no stale
 * in-memory state/query cache survives into the re-authenticated session.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLoginRequest) {
      clearAccessToken()
      if (typeof window !== 'undefined' && window.location.pathname !== '/session-expired') {
        window.location.assign('/session-expired')
      }
    }
    return Promise.reject(error)
  },
)
