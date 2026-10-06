import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchReceipt } from '@/api/plots'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { businessName } from '@/lib/business'
import { PLAN_LABEL, day, inr, instalmentLabel } from '../format'

/**
 * A plot payment receipt — printable, same paper layout as invoices: only
 * .print-area survives the print stylesheet, so the browser's print dialog
 * doubles as "Save as PDF".
 */
export function ReceiptPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { data, isLoading } = useQuery({ queryKey: ['plot-receipt', id], queryFn: () => fetchReceipt(id) })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }
  const r = data?.data
  if (!r) return <p className="text-sm text-danger">Receipt not found.</p>

  const company = r.project.company
  const tenure = r.booking.tenureMonths

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link to={`/admin/plot-sales/bookings/${r.booking._id}`}>
          <Button variant="secondary">Back to booking</Button>
        </Link>
        <Button onClick={() => window.print()}>Download / Print</Button>
      </div>

      <article className="print-area mx-auto w-full max-w-[820px] bg-white p-8 text-text sm:p-10">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
          <div>
            {company?.logo?.url && <img src={company.logo.url} alt="" className="mb-2 h-10 object-contain" />}
            <h2 className="text-lg font-semibold">{company?.name}</h2>
            <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">{businessName('t2')}</p>
            {company?.address && <p className="mt-1 max-w-xs text-sm text-text-muted">{company.address}</p>}
            <p className="text-sm text-text-muted">{[company?.city, company?.state, company?.pinCode].filter(Boolean).join(', ')}</p>
            {company?.contactNumber && <p className="text-sm text-text-muted">{company.contactNumber}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-subtle">Payment receipt</p>
            <p className="mt-1 font-mono text-base font-semibold">{r.receiptNo}</p>
            <p className="text-sm text-text-muted">Date: {day(r.paidOn)}</p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-border py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Received from</p>
            <p className="mt-1 font-medium">
              {r.client.title ? `${r.client.title} ` : ''}
              {r.client.fullName}
            </p>
            {r.client.guardianName && <p className="text-sm text-text-muted">C/o {r.client.guardianName}</p>}
            <p className="text-sm text-text-muted">{r.client.mobile}</p>
            <p className="text-sm text-text-muted">{[r.client.address, r.client.city, r.client.state].filter(Boolean).join(', ')}</p>
            <p className="mt-1 font-mono text-xs text-text-subtle">{r.client.code}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Property</p>
            <p className="mt-1 font-medium">{r.project.name}</p>
            <p className="text-sm text-text-muted">
              Plot {r.plot.name} · Block {r.plot.block?.name}
            </p>
            <p className="text-sm text-text-muted">
              {r.plot.size} sq.ft{r.plot.facing ? ` · ${r.plot.facing}` : ''}
            </p>
            <p className="mt-1 font-mono text-xs text-text-subtle">
              Booking {r.booking.code} · {PLAN_LABEL[r.booking.plan]}
            </p>
          </div>
        </section>

        <table className="mt-6 w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-subtle">
            <tr>
              <th className="py-2 font-semibold">Description</th>
              <th className="py-2 font-semibold">Due date</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-3">
                {instalmentLabel(r.kind, r.seq, tenure)} — plot {r.plot.name}
              </td>
              <td className="py-3 text-text-muted">{day(r.dueDate)}</td>
              <td className="py-3 text-right font-medium tabular-nums">{inr(r.paidAmount)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-full max-w-xs text-sm">
          <Row label="Received" value={inr(r.paidAmount)} strong />
          <Row label="Plot price" value={inr(r.booking.price)} />
          <Row label="Paid to date" value={inr(r.booking.paidTotal)} />
          <Row label="Balance" value={inr(r.balance)} />
        </div>

        <section className="mt-6 grid gap-4 border-t border-border pt-6 text-sm sm:grid-cols-2">
          <dl className="space-y-1 text-text-muted">
            <p>Mode: {r.mode ?? 'Not recorded'}</p>
            {r.reference && <p>Reference: {r.reference}</p>}
            <p>Received on: {day(r.paidOn)}</p>
          </dl>
          <div className="text-right text-text-muted">
            <p>For {company?.name}</p>
            <p className="mt-10 text-xs">Authorised signatory</p>
          </div>
        </section>
      </article>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between border-b border-border py-1.5 last:border-0">
      <span className={strong ? 'font-semibold' : 'text-text-muted'}>{label}</span>
      <span className={strong ? 'font-semibold tabular-nums' : 'tabular-nums'}>{value}</span>
    </div>
  )
}
