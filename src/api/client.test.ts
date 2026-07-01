import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as authToken from '@/lib/auth-token'

// Review finding, FR-001: the request/response interceptors previously had
// zero test coverage despite being where EC-034 (session-expiry mid-
// workflow) is actually enforced on the frontend. Interceptor functions
// are invoked directly via axios's interceptor handler arrays (the
// standard way to unit-test them without a real HTTP mocking library —
// no new dependency needed) rather than performing a real network call.

vi.mock('@/lib/auth-token')

async function loadClient() {
  vi.resetModules()
  const mod = await import('./client')
  return mod.apiClient
}

function requestInterceptor(client: Awaited<ReturnType<typeof loadClient>>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client.interceptors.request as any).handlers[0].fulfilled
}

function responseRejectedInterceptor(client: Awaited<ReturnType<typeof loadClient>>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client.interceptors.response as any).handlers[0].rejected
}

describe('apiClient request interceptor', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('attaches the Authorization header when a token is present', async () => {
    vi.mocked(authToken.getAccessToken).mockReturnValue('a-real-token')
    const client = await loadClient()

    const config = await requestInterceptor(client)({ headers: {} } as InternalAxiosRequestConfig)

    expect(config.headers.Authorization).toBe('Bearer a-real-token')
  })

  it('does not attach an Authorization header when there is no token', async () => {
    vi.mocked(authToken.getAccessToken).mockReturnValue(null)
    const client = await loadClient()

    const config = await requestInterceptor(client)({ headers: {} } as InternalAxiosRequestConfig)

    expect(config.headers.Authorization).toBeUndefined()
  })
})

describe('apiClient response interceptor (EC-034)', () => {
  let assignMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    assignMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: assignMock, pathname: '/dashboard' },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => { vi.restoreAllMocks() })

  it('clears the token and redirects to /session-expired on a 401 from a non-login call', async () => {
    const client = await loadClient()
    const rejected = responseRejectedInterceptor(client)

    await expect(
      rejected({
        response: { status: 401 },
        config: { url: '/api/v1/orders' },
      }),
    ).rejects.toBeDefined()

    expect(authToken.clearAccessToken).toHaveBeenCalledTimes(1)
    expect(assignMock).toHaveBeenCalledWith('/session-expired')
  })

  it('does NOT redirect or clear the token on the login endpoint’s own 401 (wrong credentials, not a session expiry)', async () => {
    const client = await loadClient()
    const rejected = responseRejectedInterceptor(client)

    await expect(
      rejected({
        response: { status: 401 },
        config: { url: '/api/v1/auth/login' },
      }),
    ).rejects.toBeDefined()

    expect(authToken.clearAccessToken).not.toHaveBeenCalled()
    expect(assignMock).not.toHaveBeenCalled()
  })

  it('does not redirect again if already on /session-expired (avoids a redirect loop)', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: assignMock, pathname: '/session-expired' },
      writable: true,
      configurable: true,
    })
    const client = await loadClient()
    const rejected = responseRejectedInterceptor(client)

    await expect(
      rejected({
        response: { status: 401 },
        config: { url: '/api/v1/orders' },
      }),
    ).rejects.toBeDefined()

    expect(assignMock).not.toHaveBeenCalled()
  })

  it('passes non-401 errors through untouched', async () => {
    const client = await loadClient()
    const rejected = responseRejectedInterceptor(client)

    await expect(
      rejected({
        response: { status: 500 },
        config: { url: '/api/v1/orders' },
      }),
    ).rejects.toBeDefined()

    expect(authToken.clearAccessToken).not.toHaveBeenCalled()
    expect(assignMock).not.toHaveBeenCalled()
  })

  // FR-002 fix: the original `includes('/auth/login')` check silently
  // failed to exclude '/api/v1/student-auth/login' (no '/auth/login'
  // substring — the character before "auth" is "-", not "/"), so a wrong-
  // Student-ID-or-password attempt was incorrectly treated as a session
  // expiry. These two tests pin the fixed `endsWith`-based check.
  it('does NOT redirect on the student login endpoint’s own 401 (wrong credentials)', async () => {
    const client = await loadClient()
    const rejected = responseRejectedInterceptor(client)

    await expect(
      rejected({
        response: { status: 401 },
        config: { url: '/api/v1/student-auth/login' },
      }),
    ).rejects.toBeDefined()

    expect(authToken.clearAccessToken).not.toHaveBeenCalled()
    expect(assignMock).not.toHaveBeenCalled()
  })

  it('does NOT redirect on the student change-password endpoint’s own 401 (expired change_token)', async () => {
    const client = await loadClient()
    const rejected = responseRejectedInterceptor(client)

    await expect(
      rejected({
        response: { status: 401 },
        config: { url: '/api/v1/student-auth/change-password' },
      }),
    ).rejects.toBeDefined()

    expect(authToken.clearAccessToken).not.toHaveBeenCalled()
    expect(assignMock).not.toHaveBeenCalled()
  })

  it('still redirects on a 401 from any other student-auth endpoint (e.g. a dead access token on /me)', async () => {
    const client = await loadClient()
    const rejected = responseRejectedInterceptor(client)

    await expect(
      rejected({
        response: { status: 401 },
        config: { url: '/api/v1/student-auth/me' },
      }),
    ).rejects.toBeDefined()

    expect(authToken.clearAccessToken).toHaveBeenCalledTimes(1)
    expect(assignMock).toHaveBeenCalledWith('/session-expired')
  })
})
