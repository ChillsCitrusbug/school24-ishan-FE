import { useEffect, useRef } from 'react'
import { clearAccessToken, getAccessToken } from '@/lib/auth-token'

/** Matches `orders_ws.py`'s own close code for an invalid/expired/wrong-role token. */
const UNAUTHORIZED_CLOSE_CODE = 4401

/**
 * FR-041 — a genuine WebSocket (the user's own explicit choice over a
 * lighter polling/visibility-refetch alternative, despite no such
 * infra existing anywhere in this codebase before this ticket; see
 * `docs/design/field-reconciliation/FR-041.md`). `VITE_API_BASE_URL`
 * is an `http(s)://` URL — the same base the REST client uses — so a
 * plain scheme swap derives the WS endpoint rather than a second env
 * var to keep in sync.
 */
const WS_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string).replace(/^http/, 'ws')

export interface OrderStatusChangedMessage {
  type: 'order_status_changed'
  order_id: string
  status: string
}

const INITIAL_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 15000

/**
 * Connects to `/api/v1/ws/orders` for as long as the calling component
 * is mounted and a session token exists, invoking `onStatusChange` for
 * every `order_status_changed` message the connection manager
 * broadcasts. Basic auto-reconnect with capped exponential backoff —
 * no separate polling fallback (the user's own explicit "no need for a
 * fallback" scope, matching the ticket's own single-transport intent).
 */
export function useOrderTrackingSocket(
  onStatusChange: (message: OrderStatusChangedMessage) => void,
): void {
  const onStatusChangeRef = useRef(onStatusChange)
  onStatusChangeRef.current = onStatusChange

  useEffect(() => {
    if (!getAccessToken()) return undefined

    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let attempt = 0
    let stopped = false

    function connect() {
      // Re-read the token on every (re)connect attempt, never captured
      // once — a tracking page can genuinely stay open longer than the
      // access token's own lifetime (this is exactly the use case the
      // ticket exists for), and reconnecting with a stale token would
      // otherwise retry forever against a server that keeps closing it
      // with 4401, silently losing live updates with no user-visible
      // error (review finding, FR-041 round 1).
      const token = getAccessToken()
      if (!token) {
        stopped = true
        return
      }
      socket = new WebSocket(`${WS_BASE_URL}/api/v1/ws/orders?token=${encodeURIComponent(token)}`)

      socket.onopen = () => {
        attempt = 0
      }

      socket.onmessage = (event: MessageEvent<string>) => {
        try {
          const message = JSON.parse(event.data) as OrderStatusChangedMessage
          if (message?.type === 'order_status_changed') {
            onStatusChangeRef.current(message)
          }
        } catch {
          // A malformed frame is never expected from this codebase's own
          // server, but must never crash the tracking screen either way.
        }
      }

      socket.onclose = (event: CloseEvent) => {
        if (stopped) return
        // A 4401 close means the server itself rejected this exact
        // token (expired, revoked, wrong role) — reconnecting with the
        // SAME token would just be rejected again forever, silently
        // losing live updates with no visible error. Treat it the same
        // way the REST client's own EC-034 interceptor treats a 401:
        // clear the dead token and send the user to re-authenticate,
        // rather than retrying blind.
        if (event.code === UNAUTHORIZED_CLOSE_CODE) {
          stopped = true
          clearAccessToken()
          if (typeof window !== 'undefined' && window.location.pathname !== '/session-expired') {
            window.location.assign('/session-expired')
          }
          return
        }
        const delay = Math.min(INITIAL_RECONNECT_DELAY_MS * 2 ** attempt, MAX_RECONNECT_DELAY_MS)
        attempt += 1
        reconnectTimer = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      stopped = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [])
}
