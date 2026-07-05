import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  Button,
  Card,
  Field,
  Input,
  Banner,
  Badge,
  ResultHero,
} from '@/components'
import { requestChildLink, type ChildLink } from '@/features/parent-links/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'

/**
 * SC-059 · Add Child (link request) by Student ID — Parent (FR-019).
 * Reuses the approved Sc059AddChild.tsx structure. No `parentNav.ts`
 * exists yet (Parent's own real dashboard is FR-046, a later ticket) —
 * empty nav groups, same precedent as `PlaceholderDashboard.tsx`/
 * `ParentProfileScreen.tsx`.
 *
 * The mock's own state prop only models `default | notfound | success`
 * — no distinct visual for the guardian-cap-reached (409) case. Both
 * error cases reuse the SAME danger-Banner treatment the mock already
 * defines for `notfound`, differing only in message text; the cap
 * message is shown character-for-character per the ticket's own
 * locked Interaction contract.
 */
export function AddChildScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [studentId, setStudentId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<ChildLink | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const link = await requestChildLink(studentId)
      setResult(link)
    } catch (err) {
      setError(
        extractErrorMessage(err, 'No student found with that ID. Double-check it with your school.'),
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
          groups={[]}
          user={{ initials: '', name: user?.full_name ?? '', role: 'Parent' }}
        />
      }
      topbar={<Topbar />}
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-lg">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate('/parent')}
        >
          My children
        </Button>

        {result ? (
          <Card className="p-8">
            <ResultHero
              ok
              title="Request sent"
              message={`We’ve asked your school to approve your link to ${result.student_full_name}. You’ll be notified once it’s reviewed.`}
            >
              <div className="mt-2 w-full rounded-card bg-canvas p-4 text-center">
                <div className="font-semibold text-ink">
                  {result.student_full_name} · {result.student_id_code}
                </div>
                <div className="mt-1">
                  <Badge tone="warning">Pending school approval</Badge>
                </div>
              </div>
              <Button fullWidth className="mt-5" onClick={() => navigate('/parent')}>
                Back to my children
              </Button>
            </ResultHero>
          </Card>
        ) : (
          <Card className="p-5">
            <h1 className="text-xl font-bold text-ink">Add a child</h1>
            <p className="mt-1 text-sm text-muted">
              Enter your child’s Student ID. Your school approves the link before you get access.
            </p>

            {error && (
              <div className="mt-4">
                <Banner tone="danger">{error}</Banner>
              </div>
            )}

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <Field label="Student ID">
                <Input
                  leadingIcon="user"
                  placeholder="e.g. S-40231"
                  invalid={Boolean(error)}
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                />
              </Field>
              <Banner tone="info">
                You can find the Student ID on your child’s account card from the school office.
              </Banner>
              <Button type="submit" fullWidth loading={isSubmitting}>
                Send link request
              </Button>
            </form>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
