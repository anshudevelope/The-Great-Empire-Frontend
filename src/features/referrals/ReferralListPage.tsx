import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { cancelReferral, fetchMyReferrals, fetchReferrals } from '@/api/referrals'
import { REFERRAL_STATUS_LABEL } from '@/types/referral'
import type { ReferralInvoice, ReferralStatus } from '@/types/referral'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { formatShortDate } from '@/lib/datetime'

const statusTone: Record<ReferralStatus, 'success' | 'info' | 'neutral'> = {
  unused: 'info',
  used: 'success',
  cancelled: 'neutral',
}

const money = (value: number) => `₹${value.toLocaleString('en-IN')}`
const day = (value: string | null) => formatShortDate(value)

/**
 * Every associate registered under a sponsor, with the payment and invoice.
 * Both sides see the same rows through the same component — only the data
 * source differs, and the API scopes an associate to their own referrals.
 */
export function ReferralListPage() {
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin')
  const queryClient = useQueryClient()

  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<ReferralInvoice | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['referrals', { isAdmin, status, search }],
    queryFn: () =>
      isAdmin
        ? fetchReferrals({ status: status || undefined, search: search || undefined, limit: '50' })
        : fetchMyReferrals({ status: status || undefined, limit: '50' }),
  })

  const cancel = useMutation({
    mutationFn: (id: string) => cancelReferral(id, 'Cancelled by admin'),
    onSuccess: () => {
      toast.success('Referral cancelled')
      queryClient.invalidateQueries({ queryKey: ['referrals'] })
      queryClient.invalidateQueries({ queryKey: ['referral-summary'] })
      setOpen(null)
    },
    onError: () => toast.error('Could not cancel this referral'),
  })

  const rows = data?.data ?? []

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">{isAdmin ? 'Referrals' : 'My referrals'}</h1>
          <p className="mt-1 text-sm text-text-subtle">
            {isAdmin
              ? 'Every associate registered under a sponsor, the payment recorded, and its invoice.'
              : 'Associates registered under you. Place the ones not in your tree yet from Place Members.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={status} onChange={(event) => setStatus(event.target.value)} containerClassName="w-40">
            <option value="">All statuses</option>
            <option value="unused">{REFERRAL_STATUS_LABEL.unused}</option>
            <option value="used">{REFERRAL_STATUS_LABEL.used}</option>
            <option value="cancelled">{REFERRAL_STATUS_LABEL.cancelled}</option>
          </Select>
          {isAdmin && (
            <Input
              placeholder="Search referral / invoice / ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-56"
            />
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No referrals" description="Nothing matches these filters yet." />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-text-subtle">
              <tr>
                <th className="px-4 py-3 font-semibold">Invoice</th>
                <th className="px-4 py-3 font-semibold">Referral no</th>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Sponsor</th>
                <th className="px-4 py-3 font-semibold">Tier</th>
                <th className="px-4 py-3 font-semibold">Amount paid</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id} className="border-b border-border last:border-0 hover:bg-neutral-hover/60">
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">{row.invoiceNo}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text">{row.referralNo}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-text">{row.member.memberCode}</span>
                    <span className="block text-xs text-text-subtle">{row.member.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-text">{row.issuedTo.memberCode}</span>
                    <span className="block text-xs text-text-subtle">{row.issuedTo.name}</span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{row.tierLabel}</td>
                  <td className="px-4 py-3 font-medium text-text">{money(row.amountPaid)}</td>
                  <td className="px-4 py-3 text-xs text-text-subtle">
                    {row.payment.mode ?? 'Not recorded'}
                    <span className="block">{day(row.payment.receivedOn)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[row.status]}>{REFERRAL_STATUS_LABEL[row.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setOpen(row)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title="Referral invoice" size="lg">
        {open && (
          <div className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Line label="Invoice no" value={open.invoiceNo} mono />
              <Line label="Referral no" value={open.referralNo} mono />
              <Line label="Issued on" value={day(open.issuedAt)} />
              <Line label="Issued by" value={open.issuedBy ?? '—'} />
              <Line label="Referred member" value={`${open.member.memberCode ?? ''} — ${open.member.name ?? ''}`} />
              <Line label="Received from" value={`${open.issuedTo.memberCode ?? ''} — ${open.issuedTo.name ?? ''}`} />
              <Line label="Tier" value={`${open.tier} — ${open.tierLabel}`} />
            </div>

            <div className="rounded-card border border-border bg-bg p-4">
              <p className="mb-3 text-sm font-medium text-text">Payment received</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Line label="Amount paid" value={money(open.amountPaid)} />
                <Line label="Mode" value={open.payment.mode ?? 'Not recorded'} />
                <Line label="Reference" value={open.payment.reference || '—'} />
                <Line label="Received on" value={day(open.payment.receivedOn)} />
                <Line label="Received by" value={open.payment.receivedBy?.name ?? '—'} />
              </div>
            </div>

            {open.status === 'used' && (
              <div className="rounded-card border border-success-border bg-success-bg p-4 text-sm text-success">
                {open.member.memberCode} ({open.member.name}) placed on {day(open.usedAt)}
                {open.placement?.under ? ` under ${open.placement.under}` : ''}
                {open.placement?.position ? `, ${open.placement.position} leg` : ''}
                {open.placement?.by ? ` — by the ${open.placement.by}` : ''}.
              </div>
            )}
            {open.status === 'unused' && (
              <div className="rounded-card border border-warning-border bg-warning-bg p-4 text-sm text-warning">
                {open.member.memberCode} is not in the tree yet
                {isAdmin ? ` — ${open.issuedTo.memberCode} can place them, or you can from Edit.` : ' — place them from Place Members.'}
              </div>
            )}
            {open.status === 'cancelled' && (
              <div className="rounded-card border border-border-strong bg-neutral-hover p-4 text-sm text-text-muted">
                Cancelled on {day(open.cancelledAt)}
                {open.cancelReason ? ` — ${open.cancelReason}` : ''}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {/* The printable receipt lives in the Invoices section. */}
              <Link to={`${isAdmin ? '/admin' : '/portal'}/invoices/${open._id}`}>
                <Button variant="secondary">Open invoice</Button>
              </Link>
              {isAdmin && open.status === 'unused' && (
                <Button variant="danger" isLoading={cancel.isPending} onClick={() => cancel.mutate(open._id)}>
                  Cancel payment record
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function Line({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-text-subtle">{label}</p>
      <p className={mono ? 'mt-0.5 font-mono text-sm text-text' : 'mt-0.5 text-sm text-text'}>{value}</p>
    </div>
  )
}
