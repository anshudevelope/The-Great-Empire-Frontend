import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { downloadPaymentsCsv, fetchPayments, type InstalmentKind } from '@/api/plots'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { DataTable, PageHeader, Pager, Stat, Td, Th } from '../PlotUi'
import { KIND_LABEL, day, inr, rowClass } from '../format'
import { useProjectOptions } from '../hooks'

/** Plot Sales → Payments: every receipt issued, with CSV export. */
export function PaymentsPage() {
  const projects = useProjectOptions()
  const [project, setProject] = useState('')
  const [kind, setKind] = useState<'' | InstalmentKind>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const filters = {
    project: project || undefined,
    kind: kind || undefined,
    from: from || undefined,
    to: to || undefined,
    search: search || undefined,
  }
  const { data, isLoading } = useQuery({
    queryKey: ['plot-payments', filters, page],
    queryFn: () => fetchPayments({ ...filters, page: String(page) }),
  })
  const rows = data?.data ?? []

  const exportCsv = async () => {
    setExporting(true)
    try {
      await downloadPaymentsCsv(filters)
      toast.success('Payment history downloaded')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Every plot payment received, with its receipt."
        actions={
          <Button variant="secondary" onClick={() => void exportCsv()} isLoading={exporting}>
            Export (CSV)
          </Button>
        }
      />

      {data && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <Stat label="Collected (filtered)" value={inr(data.summary.paid)} tone="good" />
          <Stat label="Receipts" value={String(data.total)} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Search receipt no or reference"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="w-full sm:w-64"
        />
        <Select value={project} onChange={(e) => setProject(e.target.value)} containerClassName="w-full sm:w-52" aria-label="Project">
          <option value="">All projects</option>
          {projects.data?.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select value={kind} onChange={(e) => setKind(e.target.value as '' | InstalmentKind)} containerClassName="w-full sm:w-44" aria-label="Type">
          <option value="">All types</option>
          <option value="full">Full payment</option>
          <option value="down">Down payment</option>
          <option value="emi">EMI</option>
        </Select>
        <Input type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full sm:w-40" />
        <Input type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} className="w-full sm:w-40" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No payments" description="Payments appear here once they're received on a booking." />
      ) : (
        <>
          <DataTable
            minWidth={980}
            head={
              <tr>
                <Th>Receipt</Th>
                <Th>Paid on</Th>
                <Th>Booking</Th>
                <Th>Client</Th>
                <Th>Type</Th>
                <Th>Credited to</Th>
                <Th right>Amount</Th>
                <Th>Mode</Th>
              </tr>
            }
          >
            {rows.map((p) => (
              <tr key={p._id} className={rowClass}>
                <Td>
                  <Link to={`/admin/plot-sales/receipts/${p._id}`} className="font-mono text-xs font-medium text-info hover:underline">
                    {p.receiptNo}
                  </Link>
                </Td>
                <Td className="text-text-muted">{day(p.paidOn)}</Td>
                <Td>
                  <Link to={`/admin/plot-sales/bookings/${p.booking?._id}`} className="font-mono text-xs text-text hover:text-info">
                    {p.booking?.code}
                  </Link>
                  <span className="block text-xs text-text-subtle">
                    {p.plot?.name} · {p.project?.name}
                  </span>
                </Td>
                <Td>
                  <span className="text-text">{p.client?.fullName}</span>
                  <span className="block text-xs text-text-subtle">{p.client?.mobile}</span>
                </Td>
                <Td className="text-text-muted">{p.kind === 'emi' ? `EMI ${p.seq}` : KIND_LABEL[p.kind]}</Td>
                <Td className="font-mono text-xs text-text-muted">{p.associate?.memberCode}</Td>
                <Td right className="font-medium text-text">
                  {inr(p.paidAmount)}
                  {p.ratingPct !== 100 && <span className="block text-xs text-text-subtle">rating {p.ratingPct}%</span>}
                </Td>
                <Td className="text-text-muted">
                  {p.mode ?? '—'}
                  {p.reference && <span className="block text-xs text-text-subtle">{p.reference}</span>}
                </Td>
              </tr>
            ))}
          </DataTable>
          {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
        </>
      )}
    </div>
  )
}
