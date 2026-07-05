import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  Button,
  Card,
  DataTable,
  Banner,
  ErrorState,
  Spinner,
  type Column,
} from '@/components'
import { listCredentials, exportCredentials, type StudentCredential } from '@/features/students/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'

/**
 * `Blob.prototype.text()` isn't implemented by jsdom (the test
 * environment) as of this writing, so `FileReader` is used instead —
 * it's supported in both jsdom and every real browser.
 */
function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read the export file.'))
    reader.readAsText(blob)
  })
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

const COLUMNS: Column<StudentCredential>[] = [
  {
    key: 'name',
    header: 'Student',
    cell: (r) => <span className="font-medium text-ink">{r.student_name}</span>,
  },
  {
    key: 'id',
    header: 'Student ID',
    cell: (r) => <span className="font-mono text-xs text-muted">{r.student_id}</span>,
  },
  { key: 'cls', header: 'Class', cell: (r) => <span className="text-muted">{r.class_name}</span> },
  {
    key: 'pw',
    header: 'Temporary password',
    cell: (r) => <span className="font-mono text-sm font-semibold text-ink">{r.temp_password}</span>,
  },
]

/**
 * SC-033 · Student Credential List (View & Export) — School Admin only
 * (FR-013). Reuses the approved Sc033Credentials.tsx structure.
 *
 * Field-reconciliation decision #3: exports as CSV, not PDF — the
 * mock's own "Exported N credentials as a PDF" copy is mock-only
 * flavor text; no PDF-generation library exists anywhere in this
 * codebase, so the success banner here says "CSV" instead.
 */
export function StudentCredentialsScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [credentials, setCredentials] = useState<StudentCredential[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportedCount, setExportedCount] = useState<number | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    listCredentials()
      .then(setCredentials)
      .catch((err: unknown) => {
        setLoadError(extractErrorMessage(err, 'Something went wrong.'))
      })
  }, [])

  async function handleExport() {
    setExportError(null)
    setIsExporting(true)
    try {
      const blob = await exportCredentials()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'student_credentials.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      // Round 1 review finding (Major): this previously used the
      // in-memory `credentials.length` from the initial page-load
      // fetch, which drifts from what's actually in the just-downloaded
      // file if a credential was purged/issued since then. Counting the
      // CSV's own data rows (minus the header) is authoritative — it's
      // exactly what was just written to disk.
      const rowCount = (await readBlobAsText(blob)).trim().split('\n').length - 1
      setExportedCount(Math.max(rowCount, 0))
    } catch (err) {
      setExportError(extractErrorMessage(err, 'Unable to export credentials.'))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          brandSubtitle={user?.school_name ?? undefined}
          groups={schoolAdminNavGroups('students')}
          user={{
            initials: user ? initialsOf(user.full_name) : '',
            name: user?.full_name ?? '',
            role: 'School Admin',
          }}
        />
      }
      topbar={<Topbar searchPlaceholder="Search…" right={<IconButton icon="bell" label="Notifications" />} />}
      mobileNav={<MobileTabBar items={schoolAdminTabs('students')} />}
    >
      <div className="mx-auto max-w-4xl">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate('/school-admin/students')}
        >
          Students
        </Button>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">Student credentials</h1>
            <p className="mt-0.5 text-sm text-muted">
              Temporary passwords for students who haven&rsquo;t signed in yet.
            </p>
          </div>
          <Button
            leadingIcon="export"
            loading={isExporting}
            disabled={!credentials || credentials.length === 0}
            onClick={handleExport}
          >
            Export
          </Button>
        </div>

        {exportedCount !== null && (
          <div className="mt-4">
            <Banner tone="success">
              Exported {exportedCount} credentials as a CSV. Keep it secure and delete it after
              handout.
            </Banner>
          </div>
        )}
        {exportError && (
          <div className="mt-4">
            <Banner tone="danger">{exportError}</Banner>
          </div>
        )}

        <div className="mt-4">
          <Banner tone="warning">
            Temporary passwords are shown for handout only. Each student sets their own password
            at first login.
          </Banner>
        </div>

        {loadError ? (
          <Card className="mt-4">
            <ErrorState message={loadError} />
          </Card>
        ) : credentials === null ? (
          <div role="status" aria-label="Loading" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <Card className="mt-4">
            <DataTable columns={COLUMNS} rows={credentials} rowKey={(r) => r.student_pk} />
          </Card>
        )}
      </div>
    </AppShell>
  )
}
