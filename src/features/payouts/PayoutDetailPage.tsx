import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  cancelPayout,
  discardPayout,
  downloadPayoutCsv,
  fetchPayout,
  fetchPayoutLines,
  finalizePayout,
} from '@/api/payouts'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatShortDate } from '@/lib/datetime'
import { LinesTable, Stat, StatusPill, money, pct } from './payoutBits'

const day = (value?: string | null) => formatShortDate(value ?? undefined)

/** One closing, read-only, with the CSV download and the cancel path. */
export function PayoutDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [reason, setReason] = useState('')

  const { data: batchData, isLoading } = useQuery({
    queryKey: ['payouts', id],
    queryFn: () => fetchPayout(id),
    enabled: Boolean(id),
  })

  const { data: linesData } = useQuery({
    queryKey: ['payouts', id, 'lines', search],
    queryFn: () => fetchPayoutLines(id, { limit: '500', search: search || undefined }),
    enabled: Boolean(id),
  })

  const cancel = useMutation({
    mutationFn: () => cancelPayout(id, reason.trim()),
    onSuccess: (res) => {
      toast.success(res.message)
      setCancelling(false)
      setReason('')
      void queryClient.invalidateQueries({ queryKey: ['payouts'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // A draft can be acted on from here as well as from Create Payout — an admin
  // who reaches it through the payout list should not have to go looking for
  // another page to finish the job.
  const finalize = useMutation({
    mutationFn: () => finalizePayout(id),
    onSuccess: (res) => {
      toast.success(res.message)
      setFinalizing(false)
      void queryClient.invalidateQueries({ queryKey: ['payouts'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
      setFinalizing(false)
    },
  })

  const discard = useMutation({
    mutationFn: () => discardPayout(id),
    onSuccess: (res) => {
      toast.success(res.message)
      void queryClient.invalidateQueries({ queryKey: ['payouts'] })
      // The batch no longer exists, so this page has nothing left to show.
      navigate('/admin/payouts')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  const batch = batchData?.data
  if (!batch) return <EmptyState title="Payout not found" description="It may have been discarded." />

  const { totals, rates } = batch
  const lines = linesData?.data ?? []

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/admin/payouts" className="text-xs text-text-subtle hover:underline">
            ← All payouts
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-text">
            <span className="font-mono text-info">{batch.batchNo}</span>
            <StatusPill status={batch.status} />
          </h1>
          <p className="mt-1 text-sm text-text-subtle">
            {day(batch.periodStart)} → {day(batch.periodEnd)}
            {batch.finalizedAt && ` · paid ${day(batch.finalizedAt)}`}
            {batch.finalizedBy && ` by ${batch.finalizedBy.fullName}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void downloadPayoutCsv(batch._id, batch.batchNo)}>
            Download (Excel)
          </Button>
          {batch.status === 'draft' && (
            <>
              <Button variant="secondary" onClick={() => discard.mutate()} isLoading={discard.isPending}>
                Discard
              </Button>
              <Button onClick={() => setFinalizing(true)}>Finalize &amp; pay</Button>
            </>
          )}
          {batch.status === 'finalized' && (
            <Button variant="danger" onClick={() => setCancelling(true)}>
              Cancel payout
            </Button>
          )}
        </div>
      </header>

      {batch.status === 'draft' && (
        <div className="mb-5 rounded-card border border-warning/30 bg-warning-bg/40 p-4">
          <p className="text-sm font-medium text-text">Nothing has been paid yet.</p>
          <p className="mt-1 text-xs text-text-muted">
            This is a preview. No commission is marked paid and no member's balance has changed
            until you finalize it.
          </p>
        </div>
      )}

      {batch.status === 'cancelled' && (
        <div className="mb-5 rounded-card bg-neutral-hover/60 p-4">
          <p className="text-sm font-medium text-text">
            Cancelled {day(batch.cancelledAt)}
            {batch.cancelledBy && ` by ${batch.cancelledBy.fullName}`}
          </p>
          {batch.cancelReason && <p className="mt-1 text-xs text-text-muted">{batch.cancelReason}</p>}
          <p className="mt-1 text-xs text-text-subtle">
            Income and carry were restored. These figures are what would have been paid.
          </p>
        </div>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Members" value={String(totals.members)} />
        <Stat label="Gross" value={money(totals.gross)} />
        <Stat label={`Admin ${pct(rates.adminChargePct)}`} value={`−${money(totals.adminCharge)}`} />
        <Stat
          label={`${rates.secondaryChargeLabel} ${pct(rates.secondaryChargePct)}`}
          value={`−${money(totals.secondaryCharge)}`}
        />
        <Stat label="Net paid" value={money(totals.netPayable)} tone="good" />
      </div>

      {totals.carryFlushed > 0 && (
        <p className="mb-5 text-xs text-text-subtle">
          {money(totals.carryFlushed)} of unmatched carry was cleared by this closing.
        </p>
      )}

      <div className="mb-4">
        <Input
          placeholder="Search member ID, name or PAN"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-72"
        />
      </div>

      {lines.length === 0 ? (
        <EmptyState title="No matching lines" description="Try a different search." />
      ) : (
        <LinesTable lines={lines} label={rates.secondaryChargeLabel} />
      )}

      <ConfirmModal
        open={finalizing}
        tone="danger"
        title={`Finalize ${batch.batchNo}?`}
        description={
          `${money(totals.netPayable)} becomes payable to ${totals.members} member(s), and everyone's income resets to zero.` +
          (rates.flushCarryOnClose && totals.carryFlushed > 0
            ? ` ${money(totals.carryFlushed)} of unmatched carry will be cleared.`
            : ' Unmatched carry is not affected.') +
          ' This can only be undone by cancelling the payout.'
        }
        confirmLabel="Finalize"
        isLoading={finalize.isPending}
        onConfirm={() => finalize.mutate()}
        onClose={() => setFinalizing(false)}
      />

      <Modal open={cancelling} onClose={() => setCancelling(false)} size="sm">
        <h2 className="text-base font-semibold text-text">Cancel {batch.batchNo}?</h2>
        <p className="mt-1 text-sm text-text-muted">
          Every member's income and carry will be restored to what it was before this closing, and the
          commission rows become unpaid again. If the money has already left the bank, this will not undo that.
        </p>
        <Input
          placeholder="Reason (required)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-4"
        />
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setCancelling(false)} disabled={cancel.isPending}>
            Keep it
          </Button>
          <Button
            variant="danger"
            onClick={() => cancel.mutate()}
            disabled={!reason.trim()}
            isLoading={cancel.isPending}
          >
            Cancel payout
          </Button>
        </div>
      </Modal>
    </div>
  )
}
