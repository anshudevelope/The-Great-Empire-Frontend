import type { Invoice } from '@/api/invoices'

const money = (value: number) =>
  `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const day = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

/**
 * The invoice itself — the part that goes on paper.
 *
 * Kept free of app chrome and buttons so `print-area` can be the only thing the
 * print stylesheet keeps. Sized for A4 at print time.
 */
export function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const { company, billedTo, transaction, items, totals, payment } = invoice
  const cancelled = invoice.status === 'Cancelled'

  return (
    <article className="print-area mx-auto w-full max-w-[820px] bg-white p-8 text-text sm:p-10">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
        <div>
          <h2 className="text-lg font-semibold">{company.name}</h2>
          {/* The registered entity, when it differs from the trading name. */}
          {company.legalName && company.legalName !== company.name && (
            <p className="text-sm text-text-muted">{company.legalName}</p>
          )}
          {company.address && <p className="mt-1 max-w-xs text-sm text-text-muted">{company.address}</p>}
          <p className="text-sm text-text-muted">
            {[company.city, company.state, company.pinCode].filter(Boolean).join(', ')}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            {[company.phone, company.email].filter(Boolean).join(' · ')}
          </p>
          {(company.gstin || company.pan) && (
            <p className="mt-1 text-xs text-text-subtle">
              {company.gstin && <>GSTIN: {company.gstin} </>}
              {company.pan && <>PAN: {company.pan}</>}
            </p>
          )}
        </div>

        <div className="text-right">
          <h1 className="text-2xl font-semibold tracking-tight">INVOICE</h1>
          <p className="mt-1 font-mono text-sm">{invoice.invoiceNo}</p>
          <p className="mt-1 text-sm text-text-muted">Date: {day(invoice.invoiceDate)}</p>
          <span
            className={[
              'mt-2 inline-block rounded-full border px-3 py-0.5 text-xs font-semibold',
              cancelled
                ? 'border-danger-border bg-danger-bg text-danger'
                : 'border-success-border bg-success-bg text-success',
            ].join(' ')}
          >
            {invoice.status}
          </span>
        </div>
      </header>

      <section className="grid gap-6 border-b border-border py-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Received from</p>
          <p className="mt-2 font-medium">{billedTo.name}</p>
          {billedTo.memberCode && <p className="font-mono text-sm text-text-muted">{billedTo.memberCode}</p>}
          {billedTo.address && <p className="mt-1 max-w-xs text-sm text-text-muted">{billedTo.address}</p>}
          <p className="mt-1 text-sm text-text-muted">
            {[billedTo.phone, billedTo.email].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Transaction</p>
          <p className="mt-2 text-sm">
            {transaction.type} · <span className="font-mono">{transaction.referenceNo}</span>
          </p>
          <p className="text-sm text-text-muted">Issued {day(transaction.issuedAt)}</p>
          {transaction.resultedIn && (
            <p className="mt-1 text-sm text-text-muted">
              Registered {transaction.resultedIn.memberCode}
              {transaction.resultedIn.name ? ` — ${transaction.resultedIn.name}` : ''}
            </p>
          )}
        </div>
      </section>

      <table className="w-full border-collapse py-6 text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-subtle">
            <th className="py-3 font-semibold">Description</th>
            <th className="py-3 text-right font-semibold">Qty</th>
            <th className="py-3 text-right font-semibold">Rate</th>
            <th className="py-3 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.reference} className="border-b border-border">
              <td className="py-3">
                <span className="font-medium">{item.description}</span>
                <span className="block font-mono text-xs text-text-subtle">Ref: {item.reference}</span>
              </td>
              <td className="py-3 text-right">{item.quantity}</td>
              <td className="py-3 text-right">{money(item.unitPrice)}</td>
              <td className="py-3 text-right font-medium">{money(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end pt-4">
        <dl className="w-full max-w-xs text-sm">
          <Row label="Subtotal" value={money(totals.subtotal)} />
          <Row label="Total" value={money(totals.total)} strong />
          <Row label="Amount received" value={money(totals.amountPaid)} />
          <Row label="Balance due" value={money(totals.balance)} strong />
        </dl>
      </div>

      <section className="mt-6 grid gap-6 border-t border-border pt-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Payment details</p>
          <dl className="mt-2 space-y-1 text-sm text-text-muted">
            <p>Mode: {payment.mode ?? 'Not recorded'}</p>
            {payment.reference && <p>Reference: {payment.reference}</p>}
            <p>Received on: {day(payment.receivedOn)}</p>
            <p>Received by: {payment.receivedBy ?? 'Not recorded'}</p>
          </dl>

          {company.bank?.accountNumber && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Bank details</p>
              <dl className="mt-2 space-y-1 text-sm text-text-muted">
                <p>{company.bank.name}</p>
                {company.bank.accountName && <p>A/c name: {company.bank.accountName}</p>}
                <p>A/c no: {company.bank.accountNumber}</p>
                {company.bank.ifsc && <p>IFSC: {company.bank.ifsc}</p>}
                {company.bank.branch && <p>Branch: {company.bank.branch}</p>}
              </dl>
            </div>
          )}
        </div>

        <div className="sm:text-right">
          <div className="inline-block pt-10">
            <div className="w-48 border-t border-border pt-2 text-sm text-text-muted sm:ml-auto">
              Authorised signatory
            </div>
          </div>
        </div>
      </section>

      {cancelled && (
        <p className="mt-6 rounded-card border border-danger-border bg-danger-bg p-3 text-sm text-danger">
          This invoice was cancelled on {day(invoice.cancelledAt)}
          {invoice.cancelReason ? ` — ${invoice.cancelReason}` : ''}.
        </p>
      )}

      {invoice.notes && <p className="mt-4 text-sm text-text-muted">Note: {invoice.notes}</p>}
      {company.invoice?.terms && <p className="mt-4 text-xs text-text-subtle">{company.invoice.terms}</p>}

      {company.invoice?.footerNote && (
        <p className="mt-8 border-t border-border pt-4 text-center text-xs text-text-subtle">
          {company.invoice.footerNote}
        </p>
      )}
    </article>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between border-b border-border py-2 last:border-0">
      <dt className={strong ? 'font-medium' : 'text-text-muted'}>{label}</dt>
      <dd className={strong ? 'font-semibold' : ''}>{value}</dd>
    </div>
  )
}
