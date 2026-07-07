import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken, clearAccessToken, getAccessToken } from '@/lib/auth-token'
import { useOrderTrackingSocket } from './useOrderTrackingSocket'

class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  url: string
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: ((event: { code: number }) => void) | null = null
  closed = false

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }

  close() {
    this.closed = true
  }
}

describe('useOrderTrackingSocket (FR-041)', () => {
  let assignMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    FakeWebSocket.instances = []
    vi.stubGlobal('WebSocket', FakeWebSocket)
    setAccessToken('a-real-jwt')
    assignMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: assignMock, pathname: '/student/orders/o1' },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearAccessToken()
  })

  it('does nothing when there is no session token', () => {
    clearAccessToken()
    const onStatusChange = vi.fn()

    renderHook(() => useOrderTrackingSocket(onStatusChange))

    expect(FakeWebSocket.instances).toHaveLength(0)
  })

  it('connects to /api/v1/ws/orders with the current token as a query param', () => {
    renderHook(() => useOrderTrackingSocket(vi.fn()))

    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(FakeWebSocket.instances[0].url).toContain('/api/v1/ws/orders?token=a-real-jwt')
  })

  it('invokes the callback for an order_status_changed message', () => {
    const onStatusChange = vi.fn()
    renderHook(() => useOrderTrackingSocket(onStatusChange))
    const socket = FakeWebSocket.instances[0]

    socket.onmessage?.({
      data: JSON.stringify({ type: 'order_status_changed', order_id: 'o1', status: 'confirmed' }),
    })

    expect(onStatusChange).toHaveBeenCalledWith({
      type: 'order_status_changed',
      order_id: 'o1',
      status: 'confirmed',
    })
  })

  it('ignores a malformed message instead of crashing', () => {
    const onStatusChange = vi.fn()
    renderHook(() => useOrderTrackingSocket(onStatusChange))
    const socket = FakeWebSocket.instances[0]

    expect(() => socket.onmessage?.({ data: 'not json' })).not.toThrow()
    expect(onStatusChange).not.toHaveBeenCalled()
  })

  it('reconnects after the socket closes', () => {
    vi.useFakeTimers()
    renderHook(() => useOrderTrackingSocket(vi.fn()))
    expect(FakeWebSocket.instances).toHaveLength(1)

    FakeWebSocket.instances[0].onclose?.({ code: 1006 })
    vi.advanceTimersByTime(1000)

    expect(FakeWebSocket.instances).toHaveLength(2)
    vi.useRealTimers()
  })

  it('closes the socket and does not reconnect on unmount', () => {
    vi.useFakeTimers()
    const { unmount } = renderHook(() => useOrderTrackingSocket(vi.fn()))
    const socket = FakeWebSocket.instances[0]

    unmount()
    socket.onclose?.({ code: 1006 })
    vi.advanceTimersByTime(5000)

    expect(socket.closed).toBe(true)
    expect(FakeWebSocket.instances).toHaveLength(1)
    vi.useRealTimers()
  })

  it('reconnects with a CURRENT token, not the one captured at mount (review finding, round 1)', () => {
    vi.useFakeTimers()
    renderHook(() => useOrderTrackingSocket(vi.fn()))
    expect(FakeWebSocket.instances[0].url).toContain('token=a-real-jwt')

    // The session token changed (e.g. a silent refresh elsewhere) while
    // this page sat open — the reconnect must pick up the NEW token,
    // not keep retrying with the stale one captured at mount.
    setAccessToken('a-refreshed-jwt')
    FakeWebSocket.instances[0].onclose?.({ code: 1006 })
    vi.advanceTimersByTime(1000)

    expect(FakeWebSocket.instances).toHaveLength(2)
    expect(FakeWebSocket.instances[1].url).toContain('token=a-refreshed-jwt')
    vi.useRealTimers()
  })

  it('on a 4401 close, clears the token and redirects to session-expired instead of reconnecting', () => {
    vi.useFakeTimers()
    renderHook(() => useOrderTrackingSocket(vi.fn()))

    FakeWebSocket.instances[0].onclose?.({ code: 4401 })
    vi.advanceTimersByTime(30000)

    expect(assignMock).toHaveBeenCalledWith('/session-expired')
    expect(getAccessToken()).toBeNull()
    expect(FakeWebSocket.instances).toHaveLength(1)
    vi.useRealTimers()
  })

  it('does not reconnect if the token was cleared (e.g. logout) before a scheduled retry fires', () => {
    vi.useFakeTimers()
    renderHook(() => useOrderTrackingSocket(vi.fn()))

    FakeWebSocket.instances[0].onclose?.({ code: 1006 })
    clearAccessToken()
    vi.advanceTimersByTime(1000)

    expect(FakeWebSocket.instances).toHaveLength(1)
    vi.useRealTimers()
  })
})
