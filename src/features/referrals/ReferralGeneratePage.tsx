import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createReferral } from '@/api/referrals'
import type { AssociateOption } from '@/api/associates'
import { ApiRequestError } from '@/api/fetchClient'
import { PAYMENT_MODES } from '@/types/referral'
import type { ReferralInvoice } from '@/types/referral'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { FormField } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { AssociateSelect } from '@/components/ui/AssociateSelect'
import { useAuthStore } from '@/store/authStore'
import { todayIST } from '@/lib/datetime'

const today = todayIST

/**
 * Gives an associate who is already registered — but has no sponsor — a
 * sponsor, and records what that sponsor paid.
 *
 * New associates get their sponsor straight from Register; this page is for
 * members created without one. No PIN is issued: the sponsor places the member
 * from their portal, or the admin sets a leg here to place them now.
 */
export function ReferralGeneratePage() {
  const queryClient = useQueryClient()
  // The payment is always received by the admin recording it — the server sets it.
  const adminName = useAuthStore((state) => state.user?.fullName ?? 'Admin')

  const [member, setMember] = useState<AssociateOption | null>(null)
  const [issuedTo, setIssuedTo] = useState<AssociateOption | null>(null)
  const [position, setPosition] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [paymentMode, setPaymentMode] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [receivedOn, setReceivedOn] = useState(today())
  const [notes, setNotes] = useState('')

  const [issued, setIssued] = useState<{ message: string; invoice: ReferralInvoice } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: createReferral,
    onSuccess: (response) => {
      setIssued({ message: response.message, invoice: response.data })
      queryClient.invalidateQueries({ queryKey: ['referrals'] })
      queryClient.invalidateQueries({ queryKey: ['associates'] })
      queryClient.invalidateQueries({ queryKey: ['associate-search'] })
      setMember(null)
      setIssuedTo(null)
      setPosition('')
      setAmountPaid('')
      setPaymentRef('')
      setPaymentMode('')
      setNotes('')
    },
    onError: (err) => {
      toast.error(err instanceof ApiRequestError ? err.message : 'Could not create referral.')
    },
  })

  const submit = () => {
    setError(null)
    if (!member) return setError('Choose the associate this referral is for.')
    if (!issuedTo) return setError('Choose the sponsor who paid for them.')
    const amount = Number(amountPaid)
    if (amountPaid === '' || !Number.isFinite(amount) || amount < 0) return setError('Enter the amount the sponsor paid.')

    mutation.mutate({
      member: member._id,
      issuedTo: issuedTo._id,
      position: position || undefined,
      amountPaid: amount,
      paymentMode: paymentMode || undefined,
      paymentRef: paymentRef || undefined,
      receivedOn: receivedOn || undefined,
      notes: notes || undefined,
    })
  }

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-text">Generate referral</h1>
        <p className="mt-1 text-sm text-text-subtle">
          For an associate who is already registered but has no sponsor yet. New associates get their sponsor directly
          from{' '}
          <Link to="/admin/associates/register" className="font-medium text-blue-700 hover:underline">
            Register
          </Link>
          .
        </p>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-3">
        <div className="flex flex-col gap-5 rounded-card border border-border bg-white p-6 xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Referred associate"
              htmlFor="member"
              required
              hint="Only associates with no sponsor who are not in the tree yet are listed."
            >
              <AssociateSelect
                id="member"
                value={member}
                onChange={setMember}
                role="associate"
                referable
                placeholder="Search by associate ID or name…"
              />
            </FormField>

            <FormField
              label="Sponsor (referrer)"
              htmlFor="issuedTo"
              required
              hint="Who paid for them. Must already be in the tree."
            >
              <AssociateSelect
                id="issuedTo"
                value={issuedTo}
                onChange={setIssuedTo}
                role="associate"
                status="approved"
                inTree
                exclude={member?._id}
                placeholder="Search by associate ID or name…"
              />
            </FormField>
          </div>

          {/* Tier is not chosen here — it belongs to the member and was fixed
              when they were registered. */}
          {member?.tier && (
            <p className="-mt-1 text-xs text-text-subtle">
              Tier comes from the member: <span className="font-medium text-text">{member.tier}</span>
            </p>
          )}

          <div className="rounded-card border border-border bg-bg p-4">
            <p className="mb-1 text-sm font-medium text-text">Payment received</p>
            <p className="mb-4 text-xs text-text-subtle">
              Money the sponsor paid to the company. Only the amount is required — the rest can be filled in later.
            </p>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField label="Amount paid (₹)" htmlFor="amountPaid" required>
                <Input
                  id="amountPaid"
                  type="number"
                  min="0"
                  inputMode="decimal"
                  placeholder="25000"
                  value={amountPaid}
                  onChange={(event) => setAmountPaid(event.target.value)}
                />
              </FormField>

              <FormField label="Payment mode" htmlFor="paymentMode">
                <Select id="paymentMode" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>
                  <option value="">Not recorded</option>
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Reference" htmlFor="paymentRef" hint="UPI txn id, cheque no, bank ref">
                <Input id="paymentRef" value={paymentRef} onChange={(event) => setPaymentRef(event.target.value)} />
              </FormField>

              <FormField label="Received on" htmlFor="receivedOn" hint="When the money actually changed hands">
                <Input id="receivedOn" type="date" value={receivedOn} onChange={(event) => setReceivedOn(event.target.value)} />
              </FormField>

              <FormField
                label="Received by"
                htmlFor="receivedBy"
                hint="Always the admin recording the payment"
                className="md:col-span-1 xl:col-span-2"
              >
                <div
                  id="receivedBy"
                  className="rounded-control border border-border-strong bg-neutral-hover px-3 py-2 text-sm text-text-muted"
                >
                  {adminName} (Admin)
                </div>
              </FormField>
            </div>
          </div>

          <div className="rounded-card border border-border bg-bg p-4">
            <p className="mb-1 text-sm font-medium text-text">Tree placement (optional)</p>
            <p className="mb-4 text-xs text-text-subtle">
              Leave this empty and the sponsor places the member from Place Members, choosing the parent and leg in their
              own tree. Set a leg to place them under the sponsor now — spillover applies if that slot is taken.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Leg" htmlFor="position">
                <Select id="position" value={position} onChange={(event) => setPosition(event.target.value)}>
                  <option value="">Leave it to the sponsor</option>
                  <option value="Left">Left</option>
                  <option value="Right">Right</option>
                </Select>
              </FormField>
            </div>
          </div>

          <FormField label="Notes" htmlFor="notes">
            <Textarea id="notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </FormField>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button onClick={submit} isLoading={mutation.isPending} className="self-start">
            Generate referral
          </Button>
        </div>

        <aside className="rounded-card border border-border bg-white p-6">
          <p className="text-sm font-semibold text-text">Summary</p>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <SummaryRow label="Member" value={member ? member.label : 'Not selected'} muted={!member} />
            <SummaryRow label="Sponsor" value={issuedTo ? issuedTo.label : 'Not selected'} muted={!issuedTo} />
            <SummaryRow label="Tier" value={member?.tier ? `${member.tier}` : 'From the member'} muted={!member?.tier} />
            <SummaryRow
              label="Placement"
              value={position ? `${position} leg, now` : 'Sponsor will place'}
              muted={!position}
            />
            <SummaryRow
              label="Amount paid"
              value={amountPaid ? `₹${Number(amountPaid).toLocaleString('en-IN')}` : 'Not entered'}
              muted={!amountPaid}
            />
            <SummaryRow label="Payment mode" value={paymentMode || 'Not recorded'} muted={!paymentMode} />
            <SummaryRow label="Received by" value={`${adminName} (Admin)`} />
          </dl>

          <div className="mt-5 rounded-card border border-info-border bg-info-bg p-3">
            <p className="text-xs font-medium text-info">No PIN needed</p>
            <p className="mt-1 text-xs text-info">
              An invoice is created for the sponsor, and the member shows up on their Place Members page straight away.
            </p>
          </div>
        </aside>
      </div>

      <Modal open={!!issued} onClose={() => setIssued(null)} title="Referral created">
        {issued && (
          <div className="flex flex-col gap-4">
            <p className="rounded-card border border-success-border bg-success-bg p-3 text-sm text-success">
              {issued.message}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Referral No" value={issued.invoice.referralNo} mono />
              <Field label="Invoice No" value={issued.invoice.invoiceNo} mono />
              <Field label="Member" value={`${issued.invoice.member.memberCode ?? '—'} — ${issued.invoice.member.name ?? ''}`} />
              <Field label="Sponsor" value={`${issued.invoice.issuedTo.memberCode ?? '—'} — ${issued.invoice.issuedTo.name ?? ''}`} />
              <Field label="Tier" value={`${issued.invoice.tier} — ${issued.invoice.tierLabel}`} />
              <Field label="Amount paid" value={`₹${issued.invoice.amountPaid.toLocaleString('en-IN')}`} />
            </div>

            <div className="flex gap-2">
              <Link to={`/admin/invoices/${issued.invoice._id}`}>
                <Button variant="secondary">Open invoice</Button>
              </Link>
              <Button onClick={() => setIssued(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function SummaryRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-0">
      <dt className="text-xs text-text-subtle">{label}</dt>
      <dd className={muted ? 'text-right text-xs text-text-subtle' : 'text-right text-sm font-medium text-text'}>
        {value}
      </dd>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-text-subtle">{label}</p>
      <p className={mono ? 'mt-0.5 font-mono text-sm text-text' : 'mt-0.5 text-sm text-text'}>{value}</p>
    </div>
  )
}
