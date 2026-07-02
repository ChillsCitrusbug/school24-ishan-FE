import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, Sidebar, Topbar, MobileTabBar, IconButton, Button, Card, Field, Input, Banner } from '@/components'
import { onboardSchool } from '@/features/schools/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { platformAdminNavGroups, platformAdminTabs } from './platformAdminNav'

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * SC-018 · Onboard New School — Platform Admin (FR-006).
 *
 * The approved Sc018Onboard.tsx has only 3 fields (School name / Admin
 * full name / Admin email) — the ticket/dbml/Gherkin's own 8-field, dual-
 * email design was never going to be built as specified (explicit user
 * decision, docs/design/field-reconciliation/FR-006.md): this screen
 * extends the approved layout with the 4 other missing fields (School
 * Type, Contact Number, Address, State/Region), same Card/Field/Input
 * components and visual language as the rest of the approved screen, but
 * does NOT add a separate "School Email" field — the duplicate-check
 * banner/copy is kept verbatim from the design, phrased around the
 * admin's own email.
 */
export function OnboardSchoolScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [schoolName, setSchoolName] = useState('')
  const [schoolType, setSchoolType] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [address, setAddress] = useState('')
  const [stateRegion, setStateRegion] = useState('')
  const [adminFullName, setAdminFullName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isDuplicateEmail, setIsDuplicateEmail] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsDuplicateEmail(false)
    setIsSubmitting(true)
    try {
      await onboardSchool({
        school_name: schoolName.trim(),
        school_type: schoolType.trim(),
        contact_number: contactNumber.trim(),
        address: address.trim() || undefined,
        state_region: stateRegion.trim() || undefined,
        primary_contact_name: adminFullName.trim(),
        primary_contact_email: adminEmail.trim(),
      })
      navigate('/platform-admin/schools', { replace: true })
    } catch (err) {
      // Review finding (Major): this used to set isDuplicateEmail
      // unconditionally on ANY failure — a blank required field, a
      // dropped network connection, a 500 — which highlighted the email
      // field in red for errors that had nothing to do with it. Only the
      // genuine 409 (server-confirmed duplicate) should highlight it.
      const status = (err as { response?: { status?: number } })?.response?.status
      setIsDuplicateEmail(status === 409)
      setError(
        extractErrorMessage(err, 'A school admin with this email already exists. Use a different email.'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          brandSubtitle="Platform"
          groups={platformAdminNavGroups()}
          user={{
            initials: user ? initialsOf(user.full_name) : '',
            name: user?.full_name ?? '',
            role: 'Platform Admin',
          }}
        />
      }
      topbar={
        <Topbar searchPlaceholder="Search…" right={<IconButton icon="bell" label="Notifications" />} />
      }
      mobileNav={<MobileTabBar items={platformAdminTabs()} />}
    >
      <div className="mx-auto max-w-lg">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate('/platform-admin/schools')}
        >
          Schools
        </Button>

        <Card className="p-5">
          <h1 className="text-xl font-bold text-ink">Onboard a new school</h1>
          <p className="mt-1 text-sm text-muted">Create the school and invite its first admin.</p>

          {error && (
            <div className="mt-4">
              <Banner tone="danger">{error}</Banner>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mt-5 space-y-4">
              <Field label="School name">
                <Input
                  placeholder="e.g. Hilltop Public"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                />
              </Field>
              <Field label="School type">
                <Input
                  placeholder="e.g. Primary"
                  value={schoolType}
                  onChange={(e) => setSchoolType(e.target.value)}
                />
              </Field>
              <Field label="Contact number">
                <Input
                  type="tel"
                  placeholder="+1-555-0100"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                />
              </Field>
              <Field label="Address">
                <Input
                  placeholder="Optional"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </Field>
              <Field label="State / region">
                <Input
                  placeholder="Optional"
                  value={stateRegion}
                  onChange={(e) => setStateRegion(e.target.value)}
                />
              </Field>
              <Field label="Admin full name">
                <Input
                  placeholder="Jane Smith"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                />
              </Field>
              <Field label="Admin email">
                <Input
                  type="email"
                  leadingIcon="user"
                  placeholder="admin@school.edu.au"
                  invalid={isDuplicateEmail}
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
              </Field>
              <Banner tone="info">
                The admin receives an activation email to set their password and finish setup.
              </Banner>
              <Button type="submit" fullWidth disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create school & send invite'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  )
}
