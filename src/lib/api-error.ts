/**
 * Extracts a user-facing message from a failed API call — and, critically,
 * never shows a domain-specific guess (e.g. "wrong password", "account
 * already exists") for a failure that never actually reached the server.
 *
 * Bug report: a CORS failure (or any network-level failure — the server
 * unreachable, a timeout, a dropped connection) surfaces to axios as an
 * error with NO `response` at all. Every screen's own catch block used to
 * do `typeof message === 'string' ? message : '<screen's own specific
 * default>'`, collapsing "the server said X" and "we never heard back
 * from the server" into the same fallback — so a CORS/network failure on
 * the registration screen showed "An account with this email already
 * exists" and on the login screen showed "The email or password is
 * incorrect", both actively misleading.
 *
 * `response` present with a string `errors` body -> that specific message
 * (the server genuinely said this). `response` missing entirely -> a
 * generic connectivity message, always, regardless of which screen calls
 * this. `response` present but the body isn't the expected shape -> the
 * caller's own domain-specific fallback (the server did respond, just not
 * as expected — a narrower, less severe case than "no response at all").
 */
export function extractErrorMessage(err: unknown, fallbackForUnexpectedShape: string): string {
  const response = (err as { response?: { data?: { errors?: unknown } } })?.response

  if (!response) {
    return 'Something went wrong. Please check your connection and try again.'
  }

  const message = response.data?.errors
  return typeof message === 'string' ? message : fallbackForUnexpectedShape
}
