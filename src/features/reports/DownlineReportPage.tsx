import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { downloadReportCsv, fetchDownlineReport } from '@/api/reports'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'

const statusTone = (status: string) =>
  status === 'approved' ? 'success' : status === 'pending' ? 'warning' : status === 'rejected' ? 'danger' : 'neutral'

/**
 * The downline report. Scope is decided by the API — an admin sees everyone,
 * an associate only their own subtree — so this component never has to know
 * which it is rendering.
 */
export function DownlineReportPage() {
  const [filters, setFilters] = useState({ status: '', tier: '', leg: '', search: '' })
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const query = useQuery({
    queryKey: ['downline-report', filters, page],
    queryFn: () =>
      fetchDownlineReport(undefined, {
        status: filters.status || undefined,
        tier: filters.tier || undefined,
        leg: filters.leg || undefined,
        search: filters.search || undefined,
        page: String(page),
        limit: '25',
      }),
  })

  const set = (key: keyof typeof filters) => (event: { target: { value: string } }) => {
    setFilters((prev) => ({ ...prev, [key]: event.target.value }))
    setPage(1)
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      await downloadReportCsv('downline', undefined, {
        status: filters.status || undefined,
        tier: filters.tier || undefined,
        leg: filters.leg || undefined,
        search: filters.search || undefined,
      })
      toast.success('Export downloaded')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const rows = query.data?.data ?? []

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">Downline report</h1>
          <p className="mt-1 text-sm text-text-subtle">
            {query.data ? `${query.data.total} members under ${query.data.scope.fullName}` : 'Loading…'}
          </p>
        </div>
        <Button variant="secondary" onClick={() => void exportCsv()} isLoading={exporting}>
          Export CSV
        </Button>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="Search name, code, email" value={filters.search} onChange={set('search')} className="w-56" />
        <Select value={filters.status} onChange={set('status')} containerClassName="w-40">
          <option value="">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </Select>
        <Select value={filters.tier} onChange={set('tier')} containerClassName="w-44">
          <option value="">All tiers</option>
          <option value="Tier I">Tier I — Insurance</option>
          <option value="Tier II">Tier II — Plots</option>
        </Select>
        <Select value={filters.leg} onChange={set('leg')} containerClassName="w-36">
          <option value="">Both legs</option>
          <option value="Left">Left leg</option>
          <option value="Right">Right leg</option>
        </Select>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No members" description="Nothing matches these filters." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-card border border-border bg-white">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-text-subtle">
                <tr>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Tier</th>
                  <th className="px-4 py-3 font-semibold">Leg</th>
                  <th className="px-4 py-3 font-semibold">Level</th>
                  <th className="px-4 py-3 font-semibold">Sponsor</th>
                  <th className="px-4 py-3 font-semibold">Placed under</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.memberCode} className="border-b border-border last:border-0 hover:bg-neutral-hover/60">
                    <td className="px-4 py-3 font-mono text-xs text-text">{row.memberCode}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-text">{row.fullName}</span>
                      <span className="block text-xs text-text-subtle">{row.email}</span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{row.tierLabel}</td>
                    <td className="px-4 py-3 text-text-muted">{row.position ?? '—'}</td>
                    <td className="px-4 py-3 text-text-muted">{row.depth}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">{row.sponsorCode ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">
                      {row.placedUnderCode ?? '—'}
                      {/* Sponsor ≠ parent means spillover moved them down the leg. */}
                      {row.isSpillover && (
                        <span className="ml-1.5 rounded-full bg-info-bg px-1.5 py-0.5 text-[10px] font-medium text-info">
                          spill
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {query.data && query.data.pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-text-subtle">
                Page {query.data.page} of {query.data.pages}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= query.data.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
