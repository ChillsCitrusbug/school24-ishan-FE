import { describe, expect, it } from 'vitest'
import { extractErrorMessage } from './api-error'

describe('extractErrorMessage', () => {
  it('returns the server-provided message when a real response came back', () => {
    const err = { response: { data: { errors: 'An account with this email already exists.' } } }

    expect(extractErrorMessage(err, 'fallback')).toBe(
      'An account with this email already exists.',
    )
  })

  // Bug report: a CORS failure (or any network-level failure — the
  // server unreachable, a timeout, a dropped connection) never produces
  // a `response` at all. This must NEVER fall through to a
  // domain-specific guess — that's exactly what showed "An account with
  // this email already exists" for a registration that never reached the
  // server, and "The email or password is incorrect" for a login that
  // never reached the server.
  it('returns a generic connectivity message when there is no response at all (network/CORS failure)', () => {
    const err = new Error('Network Error')

    expect(extractErrorMessage(err, 'An account with this email already exists.')).toBe(
      'Something went wrong. Please check your connection and try again.',
    )
  })

  it('returns the generic connectivity message even with a screen-specific fallback supplied', () => {
    const err = { message: 'Network Error' } // axios-shaped network error, no `response`

    expect(extractErrorMessage(err, 'The email or password is incorrect. Please try again.')).toBe(
      'Something went wrong. Please check your connection and try again.',
    )
  })

  it('falls back to the caller-supplied default when the server responded but not in the expected shape', () => {
    const err = { response: { data: {} } }

    expect(extractErrorMessage(err, 'Something went wrong. Please try again.')).toBe(
      'Something went wrong. Please try again.',
    )
  })
})
