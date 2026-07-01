import type { Role } from './guards'

/**
 * Role -> post-login destination (FR-001 Scenario 1).
 *
 * Only school_admin has a real, FR-001-owned dashboard (SC-023). The other
 * three roles' real dashboards belong to later tickets (platform_admin ->
 * FR-010/SC-016, staff -> FR-018/SC-041, parent -> FR-046/SC-063) — see
 * docs/design/field-reconciliation/FR-001.md. Their routes exist now (so
 * login routes somewhere real and distinct per role) and render a minimal
 * placeholder until their owning ticket replaces it.
 */
export const ROLE_HOME_PATH: Record<Role, string> = {
  platform_admin: '/platform-admin',
  school_admin: '/school-admin',
  staff: '/staff',
  parent: '/parent',
}
