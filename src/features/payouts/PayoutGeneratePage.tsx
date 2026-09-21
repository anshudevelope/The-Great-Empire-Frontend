import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  createPayoutDraft,
  discardPayout,
  downloadPayoutCsv,
  fetchDraft,
  fetchPayoutLines,
  finalizePayout,
} from '@/api/payouts'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { formatShortDate } from '@/lib/datetime'
import { LinesTable, Stat, money, pct } from './payoutBits'

const day = (value?: string | null) => formatShortDate(value ?? undefined)

/** `datetime-local` wants `YYYY-MM-DDTHH:mm` in LOCAL time, not an ISO string. */
const toLocalInput = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

/**
 * Create Payout — close the books for a period.
 *
 * Two states: no draft open (pick a close date and generate), or a draft
 * waiting to be finalized or discarded. A draft writes only itself; nothing is
 * paid and no member is touched until Finalize.
 */
export function PayoutGeneratePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // null until the admin picks one, so the suggested default can come from the
  // period the API reports rather than being frozen at first render.
  const [closeDate, setCloseDate] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const { data: draftData, isLoading } = useQuery({
    queryKey: ['payouts', 'draft'],
    queryFn: fetchDraft,
  })

  const draft = draftData?.data ?? null

  // Suggested close date only — the admin is free to move it either way.
  const nowLocal = useMemo(() => toLocalInput(new Date()), [])
  // The picker allows a week ahead: closing "as of Friday" from midweek is a
  // normal thing to do. Backdating is unrestricted. The API itself accepts any
  // date — this is a guard rail, not a rule.
  const maxClose = useMemo(() => toLocalInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), [])
  const effectiveClose = closeDate ?? nowLocal

  const { data: linesData } = useQuery({
    queryKey: ['payouts', 'draft', 'lines', draft?._id],
    queryFn: () => fetchPayoutLines(draft!._id, { limit: '500' }),
    enabled: Boolean(draft),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['payouts'] })

  const generate = useMutation({
    mutationFn: () => createPayoutDraft({ periodEnd: new Date(effectiveClose).toISOString() }),
    onSuccess: (res) => {
      toast.success(res.message)
      void refresh()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const finalize = useMutation({
    mutationFn: () => finalizePayout(draft!._id),
    onSuccess: (res) => {
      toast.success(res.message)
      setConfirming(false)
      void refresh()
      navigate(`/admin/payouts/${res.data._id}`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
      setConfirming(false)
    },
  })

  const discard = useMutation({
    mutationFn: () => discardPayout(draft!._id),
    onSuccess: (res) => {
      toast.success(res.message)
      void refresh()
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

  // ---------------------------------------------------------------------
  // No draft open — choose a close date
  // ---------------------------------------------------------------------
  if (!draft) {
    const next = draftData?.next
    return (
      <div>
        <header className="mb-5">
          <h1 className="text-xl font-semibold text-text">Create payout</h1>
          <p className="mt-1 text-sm text-text-subtle">
            Closes the books for a period, pays everyone what they have earned, and resets their income to zero.
          </p>
        </header>

        <div className="rounded-card border border-border bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-text-subtle">Start date</p>
              <p className="mt-1 text-sm font-medium text-text">{day(next?.periodStart)}</p>
              <p className="mt-0.5 text-[11px] text-text-subtle">
                Where the last closing ended. Not editable.
              </p>
            </div>
            <div>
              <label className="text-xs text-text-subtle" htmlFor="closeDate">
                Close date
              </label>
              <Input
                id="closeDate"
                type="datetime-local"
                value={effectiveClose}
                max={maxClose}
                onChange={(event) => setCloseDate(event.target.value)}
                className="mt-1"
              />
              <p className="mt-0.5 text-[11px] text-text-subtle">
                Commission earned after this moment rolls into the next payout.
              </p>
            </div>
          </div>

          {next?.rates && (
            <p className="mt-4 text-xs text-text-subtle">
              Deductions: admin {pct(next.rates.adminChargePct)} and {next.rates.secondaryChargeLabel}{' '}
              {pct(next.rates.secondaryChargePct)}, each taken on the gross total.
              {next.rates.flushCarryOnClose
                ? ' Unmatched carry will be cleared at closing.'
                : ' Unmatched carry carries forward — only the money resets.'}
            </p>
          )}

          <div className="mt-5">
            <Button onClick={() => generate.mutate()} isLoading={generate.isPending}>
              Generate preview
            </Button>
            <p className="mt-2 text-[11px] text-text-subtle">
              A preview writes nothing to anyone's balance. You can discard it.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------
  // Draft open — review, then finalize or discard
  // ---------------------------------------------------------------------
  const { totals, rates } = draft
  const lines = linesData?.data ?? []

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">
            Draft <span className="font-mono text-base text-blue-700">{draft.batchNo}</span>
          </h1>
          <p className="mt-1 text-sm text-text-subtle">
            {day(draft.periodStart)} → {day(draft.periodEnd)} · nothing has been paid yet
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void downloadPayoutCsv(draft._id, draft.batchNo)}>
            Download (Excel)
          </Button>
          <Button variant="secondary" onClick={() => discard.mutate()} isLoading={discard.isPending}>
            Discard
          </Button>
          <Button onClick={() => setConfirming(true)}>Finalize &amp; pay</Button>
        </div>
      </header>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Members" value={String(totals.members)} hint="with income this period" />
        <Stat label="Gross" value={money(totals.gross)} hint={`direct ${money(totals.grossDirect)} + matching ${money(totals.grossMatching)}`} />
        <Stat
          label="Deductions"
          value={money(totals.adminCharge + totals.secondaryCharge)}
          hint={`admin ${pct(rates.adminChargePct)} + ${rates.secondaryChargeLabel} ${pct(rates.secondaryChargePct)}`}
        />
        <Stat label="Net payable" value={money(totals.netPayable)} tone="good" />
      </div>

      {rates.flushCarryOnClose ? (
        totals.carryFlushed > 0 && (
          <div className="mb-5 rounded-card border border-danger/30 bg-danger-bg/40 p-4">
            <p className="text-sm font-medium text-danger">
              Finalizing will clear {money(totals.carryFlushed)} of unmatched carry.
            </p>
            <p className="mt-1 text-xs text-text-muted">
              That is roughly {money(totals.carryFlushed * 0.05)} of matching income members have already
              earned the volume for. It cannot be recovered except by cancelling this payout.
            </p>
          </div>
        )
      ) : (
        <p className="mb-5 text-xs text-text-subtle">
          Unmatched carry is not touched by this closing — it stays on each member's legs and can
          still pair up in a later period. Only income resets.
        </p>
      )}

      {lines.length === 0 ? (
        <EmptyState title="No lines" description="This draft covers no members." />
      ) : (
        <LinesTable lines={lines} label={rates.secondaryChargeLabel} />
      )}

      <ConfirmModal
        open={confirming}
        tone="danger"
        title={`Finalize ${draft.batchNo}?`}
        description={
          `${money(totals.netPayable)} becomes payable to ${totals.members} member(s), and everyone's income resets to zero.` +
          (rates.flushCarryOnClose && totals.carryFlushed > 0
            ? ` ${money(totals.carryFlushed)} of unmatched carry will be cleared.`
            : '') +
          ' This can only be undone by cancelling the payout.'
        }
        confirmLabel="Finalize"
        isLoading={finalize.isPending}
        onConfirm={() => finalize.mutate()}
        onClose={() => setConfirming(false)}
      />
    </div>
  )
}
