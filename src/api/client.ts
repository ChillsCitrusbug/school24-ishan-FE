import axios, { type AxiosError } from 'axios'
import { getAccessToken } from '@/lib/auth-token'

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
 * Standard error envelope placeholder. The real shape is defined by the
 * backend's response-envelope contract (reconciled per ticket) — this
 * interceptor is wired now so every future call site gets consistent
 * error handling without re-adding boilerplate per feature.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // TODO(per-ticket): normalize into the shared error envelope / surface
    // via a toast, form error, etc. once the backend contract is reconciled.
    return Promise.reject(error)
  },
)
