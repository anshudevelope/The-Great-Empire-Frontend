import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { cancelBooking, fetchBooking, receivePayment, type BookingDetail, type Instalment } from '@/api/plots'
import { ApiRequestError } from '@/api/fetchClient'
import { PAYMENT_MODES } from '@/types/referral'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Textarea } from '@/components/ui/Textarea'
import { DataTable, PageHeader, Section, Stat, Td, Th } from '../PlotUi'
import { BOOKING_STATUS_TONE, PLAN_LABEL, day, inr, instalmentLabel, rowClass, todayIso } from '../format'
import { usePlotConfig } from '../hooks'

const errorText = (error: unknown) => (error instanceof ApiRequestError ? error.message : 'Something went wrong.')

/** One booking: who, what, the full schedule; receive the next instalment or cancel. */
export function BookingDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { data, isLoading } = useQuery({ queryKey: ['plot-booking', id], queryFn: () => fetchBooking(id) })
  const [receiving, setReceiving] = useState<Instalment | null>(null)
  const [cancelling, setCancelling] = useState(false)

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
  const overdue = b.schedule.filter((s) => s.overdue)

  return (
    <div className="flex flex-col gap-5 pb-10">
      <PageHeader
        title={`Booking ${b.code}`}
        description={`${b.plot.name} · ${b.project?.name} · booked ${day(b.bookedOn)}`}
        actions={
          <>
            <Link to="/admin/plot-sales/bookings">
              <Button variant="secondary">All bookings</Button>
            </Link>
            {active && b.nextDue && <Button onClick={() => setReceiving(b.nextDue)}>Receive {inr(b.nextDue.dueAmount)}</Button>}
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
          value={overdue.length ? `${overdue.length} · ${inr(overdue.reduce((s, r) => s + r.dueAmount, 0))}` : b.nextDue ? day(b.nextDue.dueDate) : '—'}
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
          <Info label="Plan" value={b.plan === 'emi' ? `EMI · ${inr(b.downPayment)} down + ${b.tenureMonths} × ${inr(b.emiAmount)}` : PLAN_LABEL[b.plan]} />
          <Info label="Status" value={<Badge tone={BOOKING_STATUS_TONE[b.status]}>{b.status}</Badge>} />
          {b.notes && <Info label="Notes" value={b.notes} />}
        </Section>
      </div>

      {b.status === 'cancelled' && (
        <div className="rounded-card border border-danger-border bg-danger-bg px-5 py-4 text-sm text-text">
          <p className="font-semibold text-danger">Cancelled {day(b.cancel.at)}</p>
          <p className="mt-1">{b.cancel.reason}</p>
          <p className="mt-1 text-text-muted">
            Refunded {inr(b.cancel.refundAmount)}
            {b.cancel.refundMode ? ` by ${b.cancel.refundMode}` : ''}
            {b.cancel.refundReference ? ` (${b.cancel.refundReference})` : ''}. All commission from this booking was reversed.
          </p>
        </div>
      )}

      <Section title="Payment schedule">
        <DataTable
          minWidth={760}
          head={
            <tr>
              <Th>Instalment</Th>
              <Th>Due</Th>
              <Th right>Amount</Th>
              <Th>Status</Th>
              <Th>Paid</Th>
              <Th>Receipt</Th>
              <Th />
            </tr>
          }
        >
          {b.schedule.map((s) => (
            <tr key={s._id} className={rowClass}>
              <Td className="text-text">{instalmentLabel(s.kind, s.seq, b.tenureMonths)}</Td>
              <Td className="text-text-muted">{day(s.dueDate)}</Td>
              <Td right className="font-medium text-text">
                {inr(s.dueAmount)}
              </Td>
              <Td>
                {s.status === 'paid' ? (
                  <Badge tone="success">paid</Badge>
                ) : s.status === 'cancelled' ? (
                  <Badge>cancelled</Badge>
                ) : s.overdue ? (
                  <Badge tone="danger">overdue</Badge>
                ) : (
                  <Badge tone="warning">due</Badge>
                )}
              </Td>
              <Td className="text-text-muted">
                {s.status === 'paid' ? (
                  <>
                    {day(s.paidOn)}
                    <span className="block text-xs text-text-subtle">
                      {s.mode ?? '—'}
                      {s.ratingPct !== 100 ? ` · rating ${s.ratingPct}%` : ''}
                    </span>
                  </>
                ) : (
                  '—'
                )}
              </Td>
              <Td>
                {s.receiptNo ? (
                  <Link to={`/admin/plot-sales/receipts/${s._id}`} className="font-mono text-xs text-info hover:underline">
                    {s.receiptNo}
                  </Link>
                ) : (
                  '—'
                )}
              </Td>
              <Td right>
                {active && b.nextDue?._id === s._id && (
                  <Button size="sm" variant="success" onClick={() => setReceiving(s)}>
                    Receive
                  </Button>
                )}
              </Td>
            </tr>
          ))}
        </DataTable>
      </Section>

      {receiving && <ReceiveModal booking={b} instalment={receiving} onClose={() => setReceiving(null)} />}
      {cancelling && <CancelModal booking={b} onClose={() => setCancelling(false)} />}
    </div>
  )
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
    void queryClient.invalidateQueries({ queryKey: ['plot-bookings'] })
    void queryClient.invalidateQueries({ queryKey: ['plot-payments'] })
    void queryClient.invalidateQueries({ queryKey: ['plot-dues'] })
    void queryClient.invalidateQueries({ queryKey: ['plot-plots'] })
    void queryClient.invalidateQueries({ queryKey: ['plot-commission'] })
  }
}

function ReceiveModal({ booking, instalment, onClose }: { booking: BookingDetail; instalment: Instalment; onClose: () => void }) {
  const config = usePlotConfig()
  const refresh = useRefreshBooking(booking._id)
  const [paidOn, setPaidOn] = useState(todayIso())
  const [mode, setMode] = useState('Cash')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState('')

  const save = useMutation({
    mutationFn: () =>
      receivePayment(instalment._id, {
        amount: instalment.dueAmount,
        paidOn,
        mode,
        reference,
        notes,
        ratingPct: rating === '' ? (config.data?.rating.defaultPct ?? 100) : Number(rating),
      }),
    onSuccess: (res) => {
      toast.success(res.message)
      refresh()
      onClose()
    },
    onError: (error) => toast.error(errorText(error)),
  })

  return (
    <Modal scrollable open onClose={onClose} title={`Receive ${instalmentLabel(instalment.kind, instalment.seq, booking.tenureMonths)}`}>
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <div className="rounded-control bg-info-bg px-4 py-3 text-sm text-text sm:col-span-2">
          Amount <strong>{inr(instalment.dueAmount)}</strong> · due {day(instalment.dueDate)} · {booking.client.fullName}
        </div>
        <FormField label="Received on" htmlFor="rc-date">
          <Input id="rc-date" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        </FormField>
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
            <Input id="rc-rating" inputMode="decimal" placeholder={String(config.data.rating.defaultPct)} value={rating} onChange={(e) => setRating(e.target.value)} />
          </FormField>
        )}
        <FormField label="Notes" htmlFor="rc-notes" className="sm:col-span-2">
          <Textarea id="rc-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="success" isLoading={save.isPending}>
            Receive payment
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function CancelModal({ booking, onClose }: { booking: BookingDetail; onClose: () => void }) {
  const refresh = useRefreshBooking(booking._id)
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
          The plot goes back on sale, unpaid instalments are closed, and <strong>all commission this booking earned is reversed</strong> — including amounts
          already paid out, which come off the next plot payout. {inr(booking.paidTotal)} has been paid so far.
        </div>
        <FormField label="Reason" htmlFor="cn-reason" required className="sm:col-span-2">
          <Textarea id="cn-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} required />
        </FormField>
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
