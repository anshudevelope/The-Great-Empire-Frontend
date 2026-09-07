import { useState } from 'react'
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
import { todayIST } from '@/lib/datetime'

const today = todayIST

/**
 * Admin issues a referral voucher to an associate who has paid for it.
 *
 * The PIN is generated server-side and returned exactly once — it is stored
 * only as a hash, so if it is lost the voucher must be cancelled and reissued.
 * That is why the success modal is deliberately obstructive.
 */
export function ReferralGeneratePage() {
  const queryClient = useQueryClient()

  const [member, setMember] = useState<AssociateOption | null>(null)
  const [issuedTo, setIssuedTo] = useState<AssociateOption | null>(null)
  const [receivedBy, setReceivedBy] = useState<AssociateOption | null>(null)
  // Optional: place the member straight away instead of leaving it to the sponsor.
  const [position, setPosition] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [paymentMode, setPaymentMode] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [receivedOn, setReceivedOn] = useState(today())
  const [notes, setNotes] = useState('')

  const [issued, setIssued] = useState<{ pin: string; invoice: ReferralInvoice } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: createReferral,
    onSuccess: (response) => {
      setIssued({ pin: response.pin, invoice: response.data })
      queryClient.invalidateQueries({ queryKey: ['referrals'] })
      queryClient.invalidateQueries({ queryKey: ['associates'] })
      setMember(null)
      setIssuedTo(null)
      setReceivedBy(null)
      setPosition('')
      setAmountPaid('')
      setPaymentRef('')
      setPaymentMode('')
      setNotes('')
    },
    onError: (err) => {
      toast.error(err instanceof ApiRequestError ? err.message : 'Could not generate referral.')
    },
  })

  const submit = () => {
    setError(null)
    if (!member) return setError('Choose the associate this referral is for.')
    if (!issuedTo) return setError('Choose the sponsor who paid for them.')
    const amount = Number(amountPaid)
    if (!Number.isFinite(amount) || amount < 0) return setError('Enter the amount the sponsor paid.')

    mutation.mutate({
      member: member._id,
      issuedTo: issuedTo._id,
      position: position || undefined,
      amountPaid: amount,
      paymentMode: paymentMode || undefined,
      paymentRef: paymentRef || undefined,
      receivedOn: receivedOn || undefined,
      receivedBy: receivedBy?._id,
      notes: notes || undefined,
    })
  }

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-text">Generate referral</h1>
        <p className="mt-1 text-sm text-text-subtle">
          Issue a voucher to an associate who has paid for it. They redeem it from their dashboard to add a new member.
        </p>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-3">
        <div className="flex flex-col gap-5 rounded-card border border-border bg-white p-6 xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Referred associate"
              htmlFor="member"
              required
              hint="The member this payment is for. Only associates who are not yet in the tree can be referred."
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
              hint="Who paid for them. Search by Sponsor ID or name — they become the member's sponsor."
            >
              <AssociateSelect
                id="issuedTo"
                value={issuedTo}
                onChange={setIssuedTo}
                role="associate"
                status="approved"
                showSponsorCode
                exclude={member?._id}
                placeholder="Search by Sponsor ID or name…"
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
              Money the associate paid to the company. Only the amount is required — the rest can be filled in later.
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

              <FormField label="Received by" htmlFor="receivedBy" className="md:col-span-1 xl:col-span-2">
                <AssociateSelect id="receivedBy" value={receivedBy} onChange={setReceivedBy} placeholder="Who took the payment…" />
              </FormField>
            </div>
          </div>

          {/* Placement here is the exception, not the rule — normally the
              sponsor does it with the PIN. */}
          <div className="rounded-card border border-border bg-bg p-4">
            <p className="mb-1 text-sm font-medium text-text">Tree placement (optional)</p>
            <p className="mb-4 text-xs text-text-subtle">
              Leave this empty and the sponsor places the member themselves using the referral number and PIN. Only set a
              leg here if the sponsor cannot do it — it consumes the referral immediately, and the PIN becomes unusable.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Leg" htmlFor="position" hint="Spillover applies if the slot is taken">
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

        {/* Running summary — the PIN warning matters before they click, not after. */}
        <aside className="rounded-card border border-border bg-white p-6">
          <p className="text-sm font-semibold text-text">Summary</p>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <SummaryRow label="Member" value={member ? member.label : 'Not selected'} muted={!member} />
            <SummaryRow
              label="Sponsor"
              value={issuedTo ? (issuedTo.sponsorLabel ?? issuedTo.label) : 'Not selected'}
              muted={!issuedTo}
            />
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
            <SummaryRow label="Received by" value={receivedBy ? receivedBy.label : 'Not recorded'} muted={!receivedBy} />
          </dl>

          <div className="mt-5 rounded-card border border-warning-border bg-warning-bg p-3">
            <p className="text-xs font-medium text-warning">The PIN is shown once</p>
            <p className="mt-1 text-xs text-warning">
              It is stored only as a hash. Copy it before closing the dialog — if lost, the voucher has to be cancelled and
              reissued.
            </p>
          </div>
        </aside>
      </div>

      <Modal open={!!issued} onClose={() => setIssued(null)} title="Referral generated">
        {issued && (
          <div className="flex flex-col gap-4">
            <div className="rounded-card border border-warning-border bg-warning-bg p-4">
              <p className="text-sm font-medium text-warning">Copy the PIN now</p>
              <p className="mt-1 text-xs text-warning">
                It is stored only as a hash and cannot be shown again. If it is lost, cancel this referral and issue a new one.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Referral No" value={issued.invoice.referralNo} mono />
              <Field label="PIN" value={issued.pin} mono highlight />
              <Field label="Invoice No" value={issued.invoice.invoiceNo} mono />
              <Field label="Issued to" value={issued.invoice.issuedTo.memberCode ?? '—'} />
              <Field label="Tier" value={`${issued.invoice.tier} — ${issued.invoice.tierLabel}`} />
              <Field label="Amount paid" value={`₹${issued.invoice.amountPaid.toLocaleString('en-IN')}`} />
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    `Referral No: ${issued.invoice.referralNo}\nPIN: ${issued.pin}\nTier: ${issued.invoice.tier}\nAmount: ₹${issued.invoice.amountPaid}`,
                  )
                  toast.success('Copied')
                }}
              >
                Copy details
              </Button>
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

function Field({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-text-subtle">{label}</p>
      <p
        className={[
          'mt-0.5 text-sm text-text',
          mono ? 'font-mono' : '',
          highlight ? 'rounded bg-blue-50 px-2 py-1 text-base font-semibold tracking-widest text-blue-700' : '',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  )
}
