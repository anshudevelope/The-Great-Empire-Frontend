import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { downloadInvoicesCsv, fetchInvoices } from '@/api/invoices'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'

const money = (value: number) => `₹${value.toLocaleString('en-IN')}`
const day = (value?: string | null) => (value ? new Date(value).toLocaleDateString('en-IN') : '—')

/**
 * The invoice register — every payment the company has received.
 *
 * Referrals are the only transaction type today, so every row comes from one;
 * the shape is transaction-agnostic so more can be added without touching this.
 */
export function InvoiceListPage() {
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin')
  const base = isAdmin ? '/admin/invoices' : '/portal/invoices'

  const [status, setStatus] = useState('')
  const [tier, setTier] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const filters = {
    status: status || undefined,
    tier: tier || undefined,
    search: search || undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', filters, page],
    queryFn: () => fetchInvoices({ ...filters, page: String(page), limit: '25' }),
  })

  const exportCsv = async () => {
    setExporting(true)
    try {
      await downloadInvoicesCsv(filters)
      toast.success('Invoice register downloaded')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const rows = data?.data ?? []

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">Invoices</h1>
          <p className="mt-1 text-sm text-text-subtle">
            {isAdmin
              ? 'Receipts for every payment received. Open one to print or save it as PDF.'
              : 'Receipts for payments you have made. Open one to print or save it as PDF.'}
          </p>
        </div>
        <Button variant="secondary" onClick={() => void exportCsv()} isLoading={exporting}>
          Export register (CSV)
        </Button>
      </header>

      {data && (
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <Stat label="Total billed" value={money(data.summary.billed)} />
          <Stat label="Collected" value={money(data.summary.collected)} accent />
          <Stat label="Cancelled" value={money(data.summary.cancelled)} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Search invoice no, referral no or member ID"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          className="w-72"
        />
        <Select value={status} onChange={(event) => setStatus(event.target.value)} containerClassName="w-40">
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Select value={tier} onChange={(event) => setTier(event.target.value)} containerClassName="w-44">
          <option value="">All tiers</option>
          <option value="Tier I">Tier I — Insurance</option>
          <option value="Tier II">Tier II — Plots</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="An invoice is created automatically whenever a referral payment is recorded."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-card border border-border bg-white">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-text-subtle">
                <tr>
                  <th className="px-4 py-3 font-semibold">Invoice no</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Received from</th>
                  <th className="px-4 py-3 font-semibold">Transaction</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Payment</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((invoice) => (
                  <tr key={invoice._id} className="border-b border-border last:border-0 hover:bg-neutral-hover/60">
                    <td className="px-4 py-3">
                      <Link to={`${base}/${invoice._id}`} className="font-mono text-xs font-medium text-blue-700 hover:underline">
                        {invoice.invoiceNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{day(invoice.invoiceDate)}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-text">{invoice.billedTo.memberCode}</span>
                      <span className="block text-xs text-text-subtle">{invoice.billedTo.name}</span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {invoice.transaction.type}
                      <span className="block font-mono text-xs text-text-subtle">{invoice.transaction.referenceNo}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-text">{money(invoice.totals.total)}</td>
                    <td className="px-4 py-3 text-xs text-text-subtle">{invoice.payment.mode ?? 'Not recorded'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={invoice.status === 'Cancelled' ? 'neutral' : 'success'}>{invoice.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`${base}/${invoice._id}`}>
                        <Button size="sm" variant="ghost">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && data.pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-text-subtle">
                Page {data.page} of {data.pages}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="secondary" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
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

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-card border border-border bg-white p-4">
      <p className="text-xs text-text-subtle">{label}</p>
      <p className={accent ? 'mt-1 text-xl font-semibold text-blue-700' : 'mt-1 text-xl font-semibold text-text'}>
        {value}
      </p>
    </div>
  )
}
