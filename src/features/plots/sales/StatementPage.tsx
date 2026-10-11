import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchStatement } from '@/api/plots'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { businessName } from '@/lib/business'
import { PageHeader } from '../PlotUi'
import { PLAN_LABEL, adjustmentNote, allocationLabel, day, inr, instalmentLabel, instalmentStatusText } from '../format'

/**
 * A booking's account statement — printable like the receipt: only
 * .print-area survives the print stylesheet, so "Download / Print" doubles as
 * Save as PDF.
 */
export function StatementPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { data, isLoading } = useQuery({ queryKey: ['plot-statement', id], queryFn: () => fetchStatement(id) })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }
  const s = data?.data
  if (!s) return <p className="text-sm text-danger">Booking not found.</p>

  const company = s.project.company
  const cancelled = s.status === 'cancelled'
  const sum = s.summary

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print">
        <PageHeader
          title={`Statement · ${s.code}`}
          description={`${s.client.fullName} · Plot ${s.plot.name}`}
          back={`/admin/plot-sales/bookings/${s._id}`}
          actions={<Button onClick={() => window.print()}>Download / Print</Button>}
        />
      </div>

      <article className="print-area mx-auto w-full max-w-[900px] bg-white p-8 text-text sm:p-10">
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
            <p className="text-xs font-semibold uppercase tracking-widest text-text-subtle">Account statement</p>
            <p className="mt-1 font-mono text-base font-semibold">{s.code}</p>
            <p className="text-sm text-text-muted">As on {day(s.generatedAt)}</p>
            <p className="text-sm font-medium capitalize">{s.status}</p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-border py-6 sm:grid-cols-3">
          <Block title="Client">
            <p className="font-medium">
              {s.client.title ? `${s.client.title} ` : ''}
              {s.client.fullName}
            </p>
            {s.client.guardianName && <p className="text-sm text-text-muted">C/o {s.client.guardianName}</p>}
            <p className="text-sm text-text-muted">{s.client.mobile}</p>
            <p className="text-sm text-text-muted">{[s.client.address, s.client.city, s.client.state].filter(Boolean).join(', ')}</p>
            <p className="mt-1 font-mono text-xs text-text-subtle">{s.client.code}</p>
          </Block>
          <Block title="Property">
            <p className="font-medium">{s.project.name}</p>
            <p className="text-sm text-text-muted">
              Plot {s.plot.name} · Block {s.plot.block?.name}
            </p>
            <p className="text-sm text-text-muted">
              {s.plot.size} sq.ft · {s.plot.width} × {s.plot.length} ft{s.plot.facing ? ` · ${s.plot.facing}` : ''}
            </p>
          </Block>
          <Block title="Sale">
            <p className="text-sm text-text-muted">Booked on {day(s.bookedOn)}</p>
            <p className="text-sm text-text-muted">
              {PLAN_LABEL[s.plan]}
              {s.plan === 'emi' ? ` · down ${inr(s.downPayment)}` : ''}
            </p>
            <p className="text-sm text-text-muted">
              Associate {s.associate.memberCode} · {s.associate.fullName}
            </p>
          </Block>
        </section>

        <section className="grid grid-cols-2 gap-3 py-6 sm:grid-cols-3">
          <Figure label="Plot price" value={inr(sum.price)} />
          <Figure label="Paid" value={inr(sum.paid)} />
          <Figure label="Balance" value={inr(sum.balance)} strong />
          {s.plan === 'emi' && <Figure label="Current EMI" value={sum.remainingEmis ? `${inr(sum.emiAmount)} × ${sum.remainingEmis}` : '—'} />}
          <Figure label="Next due" value={sum.nextDue ? `${inr(sum.nextDue.amount)} · ${day(sum.nextDue.dueDate)}` : '—'} />
          <Figure label="Overdue" value={sum.overdueCount ? `${inr(sum.overdue)} (${sum.overdueCount})` : 'None'} warn={sum.overdueCount > 0} />
        </section>

        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Payment schedule</h3>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full min-w-[560px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-subtle">
              <tr>
                <th className="py-2 font-semibold">Instalment</th>
                <th className="py-2 font-semibold">Due date</th>
                <th className="py-2 text-right font-semibold">Amount</th>
                <th className="py-2 text-right font-semibold">Paid</th>
                <th className="py-2 text-right font-semibold">Balance</th>
                <th className="py-2 pl-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {s.schedule.map((r) => (
                <tr key={r._id} className="border-b border-border">
                  <td className="py-2">{instalmentLabel(r.kind, r.seq, s.tenureMonths)}</td>
                  <td className="py-2 text-text-muted">{day(r.dueDate)}</td>
                  <td className="py-2 text-right tabular-nums">{inr(r.dueAmount)}</td>
                  <td className="py-2 text-right tabular-nums">{r.paidAmount > 0 ? inr(r.paidAmount) : '—'}</td>
                  <td className="py-2 text-right tabular-nums">{r.status === 'cancelled' ? '—' : inr(r.remaining)}</td>
                  <td className={`py-2 pl-4 ${r.overdue ? 'font-medium text-danger' : 'text-text-muted'}`}>{instalmentStatusText(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-8 text-xs font-semibold uppercase tracking-wide text-text-subtle">Payments received</h3>
        {s.receipts.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-2 w-full min-w-[560px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-subtle">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Receipt</th>
                  <th className="py-2 pr-3 font-semibold">Date</th>
                  <th className="py-2 pr-3 font-semibold">Mode / reference</th>
                  <th className="py-2 pr-3 font-semibold">Applied to</th>
                  <th className="py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {s.receipts.map((r) => (
                  <tr key={r._id} className="border-b border-border align-top">
                    <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs">{r.receiptNo}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-text-muted">{day(r.paidOn)}</td>
                    <td className="py-2 pr-3 text-text-muted">
                      {r.mode ?? '—'}
                      {r.reference ? ` · ${r.reference}` : ''}
                    </td>
                    <td className="py-2 pr-3 text-text-muted">
                      {r.allocations.map(allocationLabel).join(', ')}
                      {r.adjustment && <span className="block text-xs">{adjustmentNote(r.adjustment)}</span>}
                    </td>
                    <td className="py-2 text-right font-medium tabular-nums">{inr(r.amount)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} className="py-2 pr-4 text-right font-semibold">
                    Total received
                  </td>
                  <td className="py-2 text-right font-semibold tabular-nums">{inr(s.receipts.reduce((t, r) => t + r.amount, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {cancelled && (
          <section className="mt-6 border-t border-border pt-4 text-sm">
            <p className="font-semibold">Booking cancelled on {day(s.cancel.at)}</p>
            <p className="text-text-muted">{s.cancel.reason}</p>
            <p className="text-text-muted">
              Refunded {inr(s.cancel.refundAmount)}
              {s.cancel.refundMode ? ` by ${s.cancel.refundMode}` : ''}
              {s.cancel.refundReference ? ` (${s.cancel.refundReference})` : ''}
            </p>
          </section>
        )}

        <section className="mt-8 grid gap-4 border-t border-border pt-6 text-sm sm:grid-cols-2">
          <p className="text-xs text-text-subtle">This is a computer-generated statement.</p>
          <div className="text-right text-text-muted">
            <p>For {company?.name}</p>
            <p className="mt-10 text-xs">Authorised signatory</p>
          </div>
        </section>
      </article>
    </div>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function Figure({ label, value, strong, warn }: { label: string; value: string; strong?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-control border border-border px-3 py-2">
      <p className="text-xs text-text-subtle">{label}</p>
      <p className={`tabular-nums ${strong ? 'font-semibold' : ''} ${warn ? 'text-danger' : ''}`}>{value}</p>
    </div>
  )
}
