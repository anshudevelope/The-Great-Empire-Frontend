import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  approveBooking,
  cancelBooking,
  fetchBooking,
  previewPayment,
  recordPayment,
  type BookingDetail,
  type Instalment,
  type PaymentAdjustment,
} from '@/api/plots'
import { ApiRequestError } from '@/api/fetchClient'
import { PAYMENT_MODES } from '@/types/referral'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Textarea } from '@/components/ui/Textarea'
import { DataTable, PageHeader, Section, Stat, Td, Th } from '../PlotUi'
import {
  ADJUSTMENT_HINT,
  ADJUSTMENT_LABEL,
  BOOKING_STATUS_TONE,
  PLAN_LABEL,
  adjustmentNote,
  allocationLabel,
  day,
  inr,
  instalmentLabel,
  rowClass,
  todayIso,
} from '../format'
import { usePlotConfig } from '../hooks'

const errorText = (error: unknown) => (error instanceof ApiRequestError ? error.message : 'Something went wrong.')

const ADJUSTMENTS: PaymentAdjustment[] = ['reduce_emi', 'reduce_tenure', 'pay_ahead']

/** One booking: who, what, the schedule and every payment; approve a pending cheque, receive a payment, print the statement, or cancel. */
export function BookingDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { data, isLoading } = useQuery({ queryKey: ['plot-booking', id], queryFn: () => fetchBooking(id) })
  const [receiving, setReceiving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const refresh = useRefreshBooking(id)
  const approve = useMutation({
    mutationFn: () => approveBooking(id),
    onSuccess: (res) => {
      toast.success(res.message)
      refresh()
      setApproving(false)
    },
    onError: (error) => toast.error(errorText(error)),
  })
  const [showReplaced, setShowReplaced] = useState(false)

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }
  const b = data?.data
  if (!b) return <p className="text-sm text-danger">Booking not found.</p>

  const active = b.status === 'active'
  const pending = b.status === 'pending'
  const cheque = b.pendingPayment
  const overdue = b.schedule.filter((s) => s.overdue)
  const replaced = b.schedule.filter((s) => s.status === 'superseded')
  const rows = showReplaced ? b.schedule : b.schedule.filter((s) => s.status !== 'superseded')
  const emisLeft = b.schedule.filter((s) => s.kind === 'emi' && (s.status === 'due' || s.status === 'partial')).length

  return (
    <div className="flex flex-col gap-5 pb-10">
      <PageHeader
        title={`Booking ${b.code}`}
        description={`${b.plot.name} · ${b.project?.name} · booked ${day(b.bookedOn)}`}
        back="/admin/plot-sales/bookings"
        actions={
          <>
            <Link to={`/admin/plot-sales/bookings/${b._id}/statement`}>
              <Button variant="secondary">Statement</Button>
            </Link>
            {active && <Button onClick={() => setReceiving(true)}>Receive payment</Button>}
            {pending && (
              <Button variant="solidSuccess" onClick={() => setApproving(true)}>
                Approve booking
              </Button>
            )}
            {b.status !== 'cancelled' && (
              <Button variant="danger" onClick={() => setCancelling(true)}>
                Cancel booking
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Price" value={inr(b.price)} />
        <Stat label="Paid" value={inr(b.paidTotal)} tone="good" />
        <Stat label="Balance" value={inr(b.status === 'cancelled' ? 0 : b.balance)} tone="accent" />
        <Stat
          label={overdue.length ? 'Overdue' : 'Next due'}
          value={
            overdue.length
              ? `${overdue.length} · ${inr(overdue.reduce((s, r) => s + r.remaining, 0))}`
              : b.nextDue
                ? `${inr(b.nextDue.remaining)} · ${day(b.nextDue.dueDate)}`
                : '—'
          }
          tone={overdue.length ? 'warn' : undefined}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Section title="Plot">
          <Info label="Plot" value={`${b.plot.name} (${b.plot.code})`} />
          <Info label="Block" value={b.plot.block?.name} />
          <Info label="Size" value={`${b.plot.size} sq.ft · ${b.plot.width} × ${b.plot.length} ft`} />
          <Info label="Facing" value={b.plot.facing || '—'} />
        </Section>
        <Section title="Client">
          <Info label="Name" value={`${b.client.title ? `${b.client.title} ` : ''}${b.client.fullName} (${b.client.code})`} />
          <Info label="Mobile" value={b.client.mobile} />
          <Info label="Address" value={[b.client.address, b.client.city].filter(Boolean).join(', ') || '—'} />
        </Section>
        <Section title="Sale">
          <Info label="Credited to" value={`${b.associate.memberCode} · ${b.associate.fullName}`} />
          <Info label="Placed in" value={b.leg ? `${b.associate.memberCode}'s ${b.leg.toLowerCase()} leg` : 'Upline only'} />
          {b.discount > 0 && (
            <Info label="Discount" value={`${inr(b.discount)} off ${inr(b.listPrice ?? b.price + b.discount)}`} />
          )}
          <Info
            label="Commission"
            value={
              pending
                ? 'Starts once the booking is approved'
                : b.allotment.reached
                  ? b.allotment.pct > 0
                    ? `Earning — ${b.allotment.pct}% allotment reached`
                    : 'Earning on every payment'
                  : `Held until ${inr(b.allotment.amount)} paid (${b.allotment.pct}% allotment)`
            }
          />
          <Info
            label="Plan"
            value={b.plan === 'emi' ? `EMI · ${inr(b.downPayment)} down · ${inr(b.emiAmount)} × ${emisLeft} left` : PLAN_LABEL[b.plan]}
          />
          <Info label="Status" value={<Badge tone={BOOKING_STATUS_TONE[b.status]}>{b.status}</Badge>} />
          {b.notes && <Info label="Notes" value={b.notes} />}
        </Section>
      </div>

      {pending && (
        <div className="rounded-card border border-warning/40 bg-warning-bg/50 px-5 py-4 text-sm text-text">
          <p className="font-semibold">Pending — waiting for the cheque to clear</p>
          {cheque && (
            <p className="mt-1 text-text-muted">
              {cheque.mode} of <strong className="text-text">{inr(cheque.amount)}</strong> dated {day(cheque.paidOn)}
              {cheque.reference ? ` (no. ${cheque.reference})` : ''}.
            </p>
          )}
          <p className="mt-1 text-text-muted">
            The plot is held for this client. Nothing counts as paid and no commission is earned until you approve. If the cheque bounces, cancel the
            booking to put the plot back on sale.
          </p>
        </div>
      )}

      {active && !b.allotment.reached && (
        <p className="rounded-card border border-warning/40 bg-warning-bg/50 px-5 py-3 text-sm text-text-muted">
          Commission on this booking is held until {inr(b.allotment.amount)} ({b.allotment.pct}% allotment) has been paid —{' '}
          <strong className="text-text">{inr(Math.max(0, b.allotment.amount - b.paidTotal))}</strong> to go. The payment that reaches it releases
          commission on every payment so far.
        </p>
      )}

      {b.status === 'cancelled' && (
        <div className="rounded-card border border-danger-border bg-danger-bg px-5 py-4 text-sm text-text">
          <p className="font-semibold text-danger">Cancelled {day(b.cancel.at)}</p>
          <p className="mt-1">{b.cancel.reason}</p>
          {cheque && !b.approval?.at ? (
            <p className="mt-1 text-text-muted">Cancelled while pending — the {cheque.mode.toLowerCase()} was never counted as paid.</p>
          ) : (
            <p className="mt-1 text-text-muted">
              Refunded {inr(b.cancel.refundAmount)}
              {b.cancel.refundMode ? ` by ${b.cancel.refundMode}` : ''}
              {b.cancel.refundReference ? ` (${b.cancel.refundReference})` : ''}. All commission from this booking was reversed.
            </p>
          )}
        </div>
      )}

      <Section title="Payment schedule">
        {replaced.length > 0 && (
          <div className="mb-3 flex justify-end">
            <Button size="sm" variant="ghost" onClick={() => setShowReplaced((v) => !v)}>
              {showReplaced ? 'Hide earlier schedule' : `Show earlier schedule (${replaced.length})`}
            </Button>
          </div>
        )}
        <DataTable
          minWidth={760}
          head={
            <tr>
              <Th>Instalment</Th>
              <Th>Due</Th>
              <Th right>Amount</Th>
              <Th right>Paid</Th>
              <Th>Status</Th>
              <Th>Last paid</Th>
            </tr>
          }
        >
          {rows.map((s) => (
            <tr key={s._id} className={`${rowClass} ${s.status === 'superseded' ? 'opacity-60' : ''}`}>
              <Td className="text-text">{instalmentLabel(s.kind, s.seq, b.tenureMonths)}</Td>
              <Td className="text-text-muted">{day(s.dueDate)}</Td>
              <Td right className="font-medium text-text">
                {inr(s.dueAmount)}
              </Td>
              <Td right className="text-text-muted">
                {s.paidAmount > 0 ? inr(s.paidAmount) : '—'}
                {s.status === 'partial' && <span className="block text-xs text-text-subtle">{inr(s.remaining)} left</span>}
              </Td>
              <Td>
                <InstalmentBadge s={s} />
              </Td>
              <Td className="text-text-muted">{day(s.lastPaidOn)}</Td>
            </tr>
          ))}
        </DataTable>
      </Section>

      <Section title="Payments received">
        {b.receipts.length === 0 ? (
          <p className="text-sm text-text-subtle">No payments yet.</p>
        ) : (
          <DataTable
            minWidth={760}
            head={
              <tr>
                <Th>Receipt</Th>
                <Th>Date</Th>
                <Th>Applied to</Th>
                <Th>Mode</Th>
                <Th right>Amount</Th>
              </tr>
            }
          >
            {b.receipts.map((r) => (
              <tr key={r._id} className={rowClass}>
                <Td>
                  <Link to={`/admin/plot-sales/receipts/${r._id}`} className="font-mono text-xs text-info hover:underline">
                    {r.receiptNo}
                  </Link>
                </Td>
                <Td className="text-text-muted">{day(r.paidOn)}</Td>
                <Td className="text-text-muted">
                  {r.allocations.map(allocationLabel).join(', ')}
                  {r.adjustment && <span className="block text-xs text-text-subtle">{adjustmentNote(r.adjustment)}</span>}
                </Td>
                <Td className="text-text-muted">
                  {r.mode ?? '—'}
                  {r.reference && <span className="block text-xs text-text-subtle">{r.reference}</span>}
                </Td>
                <Td right className="font-medium text-text">
                  {inr(r.amount)}
                  {r.ratingPct !== 100 && <span className="block text-xs text-text-subtle">rating {r.ratingPct}%</span>}
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Section>

      {receiving && <ReceiveModal booking={b} onClose={() => setReceiving(false)} />}
      <ConfirmModal
        open={approving}
        title={`Approve ${b.code}?`}
        description={
          cheque
            ? `Confirm the ${cheque.mode.toLowerCase()} of ${inr(cheque.amount)} has cleared. It is recorded as the first payment with a receipt, and commission runs as usual.`
            : 'The booking becomes active and commission runs as usual.'
        }
        confirmLabel="Approve"
        isLoading={approve.isPending}
        onConfirm={() => approve.mutate()}
        onClose={() => setApproving(false)}
      />
      {cancelling && <CancelModal booking={b} onClose={() => setCancelling(false)} />}
    </div>
  )
}

function InstalmentBadge({ s }: { s: Instalment }) {
  if (s.status === 'paid') return <Badge tone="success">paid</Badge>
  if (s.status === 'cancelled') return <Badge>cancelled</Badge>
  if (s.status === 'superseded') return <Badge>replaced</Badge>
  const label = s.status === 'partial' ? 'part-paid' : 'due'
  return s.overdue ? <Badge tone="danger">{`${label} · overdue`}</Badge> : <Badge tone="warning">{label}</Badge>
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border py-2 text-sm last:border-0">
      <span className="text-text-subtle">{label}</span>
      <span className="text-right text-text">{value}</span>
    </div>
  )
}

function useRefreshBooking(id: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['plot-booking', id] })
    void queryClient.invalidateQueries({ queryKey: ['plot-statement', id] })
    void queryClient.invalidateQueries({ queryKey: ['plot-bookings'] })
    void queryClient.invalidateQueries({ queryKey: ['plot-payments'] })
    void queryClient.invalidateQueries({ queryKey: ['plot-dues'] })
    void queryClient.invalidateQueries({ queryKey: ['plot-plots'] })
    void queryClient.invalidateQueries({ queryKey: ['plot-commission'] })
  }
}

function ReceiveModal({ booking, onClose }: { booking: BookingDetail; onClose: () => void }) {
  const config = usePlotConfig()
  const refresh = useRefreshBooking(booking._id)
  const suggested = booking.dueNow > 0 ? booking.dueNow : (booking.nextDue?.remaining ?? 0)
  const [amount, setAmount] = useState(suggested ? String(suggested) : '')
  const [paidOn, setPaidOn] = useState(todayIso())
  const [adjustment, setAdjustment] = useState<PaymentAdjustment | null>(null)
  const [mode, setMode] = useState('Cash')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState('')

  // Typing an amount shouldn't fire a preview per keystroke.
  const [debounced, setDebounced] = useState(amount)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(amount), 300)
    return () => window.clearTimeout(timer)
  }, [amount])

  const preview = useQuery({
    queryKey: ['plot-payment-preview', booking._id, debounced, paidOn, adjustment],
    queryFn: () => previewPayment(booking._id, { amount: debounced, paidOn, adjustment: adjustment ?? undefined }),
    enabled: Number(debounced) > 0,
    retry: false,
    placeholderData: keepPreviousData,
  })
  const p = preview.isError ? undefined : preview.data?.data
  const showChoice = !!p && p.extra > 0 && !p.completes
  // Keep the choices on screen while a chosen option's preview reloads or is
  // refused, so the admin can switch to another one instead of being stuck.
  const choiceVisible = showChoice || (adjustment !== null && (preview.isError || preview.isFetching))
  const ready = !!p && debounced === amount && !preview.isFetching && !preview.isError && !(showChoice && !adjustment)

  const save = useMutation({
    mutationFn: () =>
      recordPayment(booking._id, {
        amount: Number(amount),
        paidOn,
        mode,
        reference,
        notes,
        ratingPct: rating === '' ? (config.data?.rating.defaultPct ?? 100) : Number(rating),
        adjustment: showChoice ? adjustment : null,
      }),
    onSuccess: (res) => {
      toast.success(res.message)
      refresh()
      onClose()
    },
    onError: (error) => toast.error(errorText(error)),
  })

  return (
    <Modal scrollable open onClose={onClose} title={`Receive payment · ${booking.code}`}>
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (ready) save.mutate()
        }}
      >
        <FormField label="Amount (₹)" htmlFor="rc-amount" required hint={`Up to ${inr(booking.balance)}`}>
          <Input id="rc-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </FormField>
        <FormField label="Received on" htmlFor="rc-date">
          <Input id="rc-date" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        </FormField>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          {booking.dueNow > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setAmount(String(booking.dueNow))}>
              Due now {inr(booking.dueNow)}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setAmount(String(booking.balance))}>
            Full balance {inr(booking.balance)}
          </Button>
        </div>

        {choiceVisible && (
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium text-text">Apply the extra{p ? ` ${inr(p.extra)}` : ''} as</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {ADJUSTMENTS.map((key) => (
                <label
                  key={key}
                  className={`flex cursor-pointer items-start gap-2 rounded-control border px-3 py-2 text-sm ${
                    adjustment === key ? 'border-info-border bg-info-bg' : 'border-border'
                  }`}
                >
                  <input
                    type="radio"
                    name="rc-adjust"
                    value={key}
                    checked={adjustment === key}
                    onChange={() => setAdjustment(key)}
                    className="mt-0.5 accent-[var(--color-info)]"
                  />
                  <span>
                    <span className="block font-medium text-text">{ADJUSTMENT_LABEL[key]}</span>
                    <span className="block text-xs text-text-subtle">{ADJUSTMENT_HINT[key]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="rounded-control bg-info-bg px-4 py-3 text-sm text-text sm:col-span-2">
          <p>
            Due now <strong>{inr(booking.dueNow)}</strong> · Balance <strong>{inr(booking.balance)}</strong> · {booking.client.fullName}
          </p>
          {preview.isError && <p className="mt-1 text-danger">{errorText(preview.error)}</p>}
          {p && !preview.isError && (
            <ul className="mt-2 space-y-0.5 text-text-muted">
              {p.allocations.map((a, i) => (
                <li key={i}>
                  {allocationLabel(a)} — {inr(a.amount)}
                </li>
              ))}
              {p.adjustment && adjustmentNote(p.adjustment) && <li className="text-text">{adjustmentNote(p.adjustment)}</li>}
              {p.completes ? (
                <li className="font-medium text-success">This clears the balance and closes the booking.</li>
              ) : (
                <li>Balance after: {inr(p.balanceAfter)}</li>
              )}
            </ul>
          )}
        </div>

        <FormField label="Mode" htmlFor="rc-mode">
          <Select id="rc-mode" value={mode} onChange={(e) => setMode(e.target.value)}>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Reference" htmlFor="rc-ref" hint="UPI txn id, cheque no …">
          <Input id="rc-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
        </FormField>
        {config.data?.rating.enabled && (
          <FormField label="Rating %" htmlFor="rc-rating" hint="Share that earns commission.">
            <Input
              id="rc-rating"
              inputMode="decimal"
              placeholder={String(config.data.rating.defaultPct)}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            />
          </FormField>
        )}
        <FormField label="Notes" htmlFor="rc-notes" className="sm:col-span-2">
          <Textarea id="rc-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="success" isLoading={save.isPending} disabled={!ready}>
            Receive payment
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function CancelModal({ booking, onClose }: { booking: BookingDetail; onClose: () => void }) {
  const refresh = useRefreshBooking(booking._id)
  // A pending booking has had nothing paid, so there is nothing to refund or reverse.
  const pending = booking.status === 'pending'
  const [reason, setReason] = useState('')
  const [refund, setRefund] = useState('')
  const [refundMode, setRefundMode] = useState('')
  const [refundReference, setRefundReference] = useState('')

  const save = useMutation({
    mutationFn: () =>
      cancelBooking(booking._id, { reason, refundAmount: Number(refund) || 0, refundMode, refundReference }),
    onSuccess: (res) => {
      toast.success(res.message)
      refresh()
      onClose()
    },
    onError: (error) => toast.error(errorText(error)),
  })

  return (
    <Modal scrollable open onClose={onClose} title={`Cancel ${booking.code}?`}>
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <div className="rounded-control border border-danger-border bg-danger-bg px-4 py-3 text-sm text-text sm:col-span-2">
          {pending ? (
            <>
              The plot goes back on sale and the schedule is closed. The cheque was never counted, so there is no refund and no commission to reverse.
            </>
          ) : (
            <>
              The plot goes back on sale, unpaid instalments are closed, and <strong>all commission this booking earned is reversed</strong> — including
              amounts already paid out, which come off the next plot payout. {inr(booking.paidTotal)} has been paid so far.
            </>
          )}
        </div>
        <FormField label="Reason" htmlFor="cn-reason" required className="sm:col-span-2">
          <Textarea
            id="cn-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={pending ? 'e.g. Cheque bounced' : undefined}
            required
          />
        </FormField>
        {!pending && (
          <>
            <FormField label="Refund given (₹)" htmlFor="cn-refund" hint={`0 to ${inr(booking.paidTotal)}`}>
              <Input id="cn-refund" inputMode="decimal" value={refund} onChange={(e) => setRefund(e.target.value)} />
            </FormField>
            <FormField label="Refund mode" htmlFor="cn-mode">
              <Select id="cn-mode" value={refundMode} onChange={(e) => setRefundMode(e.target.value)}>
                <option value="">—</option>
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Refund reference" htmlFor="cn-ref" className="sm:col-span-2">
              <Input id="cn-ref" value={refundReference} onChange={(e) => setRefundReference(e.target.value)} />
            </FormField>
          </>
        )}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            Keep booking
          </Button>
          <Button type="submit" variant="danger" isLoading={save.isPending} disabled={!reason.trim()}>
            Cancel booking
          </Button>
        </div>
      </form>
    </Modal>
  )
}
