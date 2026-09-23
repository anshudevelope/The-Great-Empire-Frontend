import { cn } from '@/lib/cn'
import type { PayoutLine, PayoutStatus } from '@/api/payouts'

/** Two decimals, grouped Indian-style, with the symbol. */
export const money = (value: number) =>
  `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const pct = (fraction: number) => `${+(fraction * 100).toFixed(2)}%`

const STATUS_STYLE: Record<PayoutStatus, string> = {
  draft: 'bg-warning-bg text-warning',
  finalized: 'bg-success-bg text-success',
  cancelled: 'bg-neutral-hover text-text-subtle line-through',
}

export function StatusPill({ status }: { status: PayoutStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
        STATUS_STYLE[status],
      )}
    >
      {status}
    </span>
  )
}

export function Stat({
  label,
  value,
  hint,
  tone = 'plain',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'plain' | 'good' | 'warn'
}) {
  return (
    <div
      className={cn(
        'rounded-card border p-4',
        tone === 'good' && 'border-success/30 bg-success-bg/40',
        tone === 'warn' && 'border-danger/30 bg-danger-bg/40',
        tone === 'plain' && 'border-border bg-surface',
      )}
    >
      <p className="text-xs text-text-subtle">{label}</p>
      <p
        className={cn(
          'mt-1 text-lg font-semibold tabular-nums',
          tone === 'good' ? 'text-success' : tone === 'warn' ? 'text-danger' : 'text-text',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-text-subtle">{hint}</p>}
    </div>
  )
}

/**
 * Why a line is not being paid this period.
 *
 * Both cases roll the gross into the next batch rather than dropping it, so the
 * wording says "carried", not "withheld" — the member has not lost anything.
 */
export function HeldPill({ reason }: { reason: PayoutLine['heldReason'] }) {
  if (!reason) return null
  const label = reason === 'negative' ? 'carried (negative)' : 'carried (below minimum)'
  return (
    <span className="ml-1 inline-flex items-center rounded-full bg-warning-bg px-1.5 py-0.5 text-[10px] text-warning">
      {label}
    </span>
  )
}

/** The payout table, shared by the generate page and the read-only detail view. */
export function LinesTable({ lines, label }: { lines: PayoutLine[]; label: string }) {
  return (
    <div className="overflow-x-auto rounded-card bg-surface">
      <table className="w-full min-w-[980px] text-sm">
        <thead className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-text-subtle">
          <tr>
            <th className="px-3 py-3 font-semibold">Sno.</th>
            <th className="px-3 py-3 font-semibold">Member</th>
            <th className="px-3 py-3 font-semibold">PAN</th>
            <th className="px-3 py-3 text-right font-semibold">Direct (10%)</th>
            <th className="px-3 py-3 text-right font-semibold">Matching (5%)</th>
            <th className="px-3 py-3 text-right font-semibold">Total</th>
            <th className="px-3 py-3 text-right font-semibold">Admin</th>
            <th className="px-3 py-3 text-right font-semibold">{label}</th>
            <th className="px-3 py-3 text-right font-semibold">Net payable</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={line._id} className="border-b border-border last:border-0 hover:bg-neutral-hover/60">
              <td className="px-3 py-2.5 text-text-subtle">{index + 1}</td>
              <td className="px-3 py-2.5">
                <span className="font-mono text-xs font-medium text-text">{line.memberCode}</span>
                <span className="block text-xs text-text-subtle">
                  {line.fullName}
                  <HeldPill reason={line.heldReason} />
                </span>
              </td>
              <td className="px-3 py-2.5 text-xs text-text-subtle">{line.pan || '—'}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{money(line.direct)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{money(line.matching)}</td>
              <td className="px-3 py-2.5 text-right font-medium tabular-nums text-text">{money(line.total)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-text-subtle">−{money(line.adminCharge)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-text-subtle">−{money(line.secondaryCharge)}</td>
              <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-success">
                {money(line.netPayable)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
