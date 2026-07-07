import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, Sidebar, Topbar, MobileTabBar, IconButton, Button, Card, Field, Input, ResultHero, Icon } from '@/components'
import { useAuth } from '@/features/auth/useAuth'
import { exportAdminOrders } from '@/features/orders/api'
import { extractErrorMessage } from '@/lib/api-error'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

/**
 * SC-085 · Export Order Data (FR-042). Reuses the approved
 * Sc085Export.tsx structure for the date-range fields. This ticket's
 * own DoD names CSV only ("GET /api/v1/orders/export produces a CSV
 * export") — matching this codebase's own established precedent
 * (FR-013's `credentials_to_csv`: "CSV, not PDF/XLSX — no such library
 * exists anywhere in this codebase"). The mock's own Format
 * select (CSV/XLSX/PDF) and "Include" column checkboxes are backend-
 * unsupported for this ticket and are dropped — a disclosed, minimal
 * reduction, the same precedent FR-038 set for its own out-of-scope
 * "Cancel order" button.
 */
export function ExportOrdersScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0, 10)
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [ready, setReady] = useState<{ blob: Blob; filename: string } | null>(null)

  async function handleGenerate() {
    setExportError(null)
    setIsExporting(true)
    try {
      const blob = await exportAdminOrders({ date_from: dateFrom, date_to: dateTo })
      setReady({ blob, filename: `orders_${dateFrom}-to-${dateTo}.csv` })
    } catch (err: unknown) {
      setExportError(extractErrorMessage(err, 'Something went wrong.'))
    } finally {
      setIsExporting(false)
    }
  }

  function handleDownload() {
    if (!ready) return
    const url = window.URL.createObjectURL(ready.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = ready.filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          brandSubtitle={user?.school_name ?? undefined}
          groups={schoolAdminNavGroups('allOrders')}
          user={{
            initials: user ? initialsOf(user.full_name) : '',
            name: user?.full_name ?? '',
            role: 'School Admin',
          }}
        />
      }
      topbar={<Topbar searchPlaceholder="Search…" right={<IconButton icon="bell" label="Notifications" />} />}
      mobileNav={<MobileTabBar items={schoolAdminTabs('allOrders')} />}
    >
      <div className="mx-auto max-w-lg">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate('/school-admin/orders/all')}
        >
          Orders
        </Button>

        {ready ? (
          <Card className="p-6">
            <ResultHero
              ok
              title="Your export is ready"
              message="The file has been generated. Keep it secure — it contains student order data."
            >
              <div className="mt-2 flex w-full items-center gap-3 rounded-card border border-line bg-canvas p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-brand/10 text-brand">
                  <Icon name="export" />
                </span>
                <div className="min-w-0 text-left">
                  <div className="truncate text-sm font-medium text-ink">{ready.filename}</div>
                  <div className="text-xs text-muted">CSV · {formatBytes(ready.blob.size)}</div>
                </div>
              </div>
              <div className="mt-5 flex w-full flex-col gap-2">
                <Button leadingIcon="export" onClick={handleDownload}>
                  Download
                </Button>
                <Button variant="secondary" onClick={() => navigate('/school-admin/orders/all')}>
                  Done
                </Button>
              </div>
            </ResultHero>
          </Card>
        ) : (
          <Card className="p-5">
            <h1 className="text-xl font-bold text-ink">Export order data</h1>
            <p className="mt-1 text-sm text-muted">Choose a date range to download a CSV.</p>

            {exportError && (
              <p role="alert" className="mt-3 text-sm text-danger">
                {exportError}
              </p>
            )}

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="From">
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </Field>
                <Field label="To">
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </Field>
              </div>
              <Button fullWidth leadingIcon="export" onClick={handleGenerate} disabled={isExporting}>
                {isExporting ? 'Generating…' : 'Generate export'}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
