import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  cancelPlotPayout,
  discardPlotPayout,
  downloadPlotPayoutCsv,
  fetchPlotPayout,
  fetchPlotPayoutNext,
  fetchPlotPayouts,
  finalizePlotPayout,
  generatePlotPayout,
  type PayoutStatus,
} from '@/api/plots'
import { ApiRequestError } from '@/api/fetchClient'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { Textarea } from '@/components/ui/Textarea'
import { DataTable, PageHeader, Pager, Stat, Td, Th } from '../PlotUi'
import { day, inr, localIsoDay, pct, rowClass, todayIso } from '../format'
import { usePlotConfig } from '../hooks'

const errorText = (error: unknown) => (error instanceof ApiRequestError ? error.message : 'Something went wrong.')
const STATUS_TONE: Record<PayoutStatus, 'warning' | 'success' | 'neutral'> = { draft: 'warning', finalized: 'success', cancelled: 'neutral' }

/** Plot Commission → Payouts: close the books on plot commission, separately from registration. */
export function PlotPayoutsPage() {
  const config = usePlotConfig()
  const [page, setPage] = useState(1)
  const [generating, setGenerating] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: ['plot-payouts', page], queryFn: () => fetchPlotPayouts({ page: String(page) }) })
  const rows = data?.data ?? []
  const hasDraft = rows.some((p) => p.status === 'draft')

  return (
    <div>
      <PageHeader
        title="Plot payouts"
        description={
          config.data
            ? `Pays out unpaid plot commission. Admin charge ${pct(config.data.payout.adminChargePct)} and TDS ${pct(config.data.payout.tdsPct)} of the gross (set in plotConfig).`
            : 'Pays out unpaid plot commission.'
        }
        actions={
          <>
            <Link to="/admin/plot-commission">
              <Button variant="secondary">Plot commission</Button>
            </Link>
            <Button onClick={() => setGenerating(true)} disabled={hasDraft}>
              Generate payout
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No plot payouts yet" description="Generate a draft to see what each associate is owed, then finalize it." />
      ) : (
        <>
          <DataTable
            minWidth={820}
            head={
              <tr>
                <Th>Payout</Th>
                <Th>Period</Th>
                <Th right>Members</Th>
                <Th right>Gross</Th>
                <Th right>Net payable</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            }
          >
            {rows.map((p) => (
              <tr key={p._id} className={rowClass}>
                <Td className="font-mono text-xs font-medium text-text">{p.payoutNo}</Td>
                <Td className="text-text-muted">{periodLabel(p)}</Td>
                <Td right>{p.totals.members}</Td>
                <Td right>{inr(p.totals.gross)}</Td>
                <Td right className="font-semibold text-text">
                  {inr(p.totals.netPayable)}
                </Td>
                <Td>
                  <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                </Td>
                <Td right>
                  <Link to={`/admin/plot-commission/payouts/${p._id}`}>
                    <Button size="sm" variant="ghost">
                      Open
                    </Button>
                  </Link>
                </Td>
              </tr>
            ))}
          </DataTable>
          {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
        </>
      )}

      {generating && <GenerateModal onClose={() => setGenerating(false)} />}
    </div>
  )
}

/** "1/10/2026 → 31/10/2026", or "up to 31/10/2026" for payouts made before start dates existed. */
const periodLabel = (p: { periodStart: string | null; periodEnd: string }) =>
  p.periodStart ? `${day(p.periodStart)} → ${day(p.periodEnd)}` : `up to ${day(p.periodEnd)}`

function GenerateModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const next = useQuery({ queryKey: ['plot-payouts', 'next'], queryFn: fetchPlotPayoutNext })
  // null until the admin picks one, so the default can come from the API.
  const [startDate, setStartDate] = useState<string | null>(null)
  const [closeDate, setCloseDate] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const suggestedStart = next.data ? localIsoDay(next.data.data.periodStart) : todayIso()
  const periodStart = startDate ?? suggestedStart
  // Today, or the suggested start when the last payout already closed today —
  // so the form never opens with the start after the close.
  const periodEnd = closeDate ?? (suggestedStart > todayIso() ? suggestedStart : todayIso())
  // Reaching back into an already-closed period: flagged, not blocked — the
  // start only labels the payout, so nothing can be paid twice.
  const previous = next.data?.data.previous ?? null
  const overlaps = !!previous && periodStart <= localIsoDay(previous.periodEnd)
  const backwards = periodStart > periodEnd

  const save = useMutation({
    mutationFn: () => generatePlotPayout({ periodStart, periodEnd, note }),
    onSuccess: (res) => {
      toast.success(res.message)
      void queryClient.invalidateQueries({ queryKey: ['plot-payouts'] })
      navigate(`/admin/plot-commission/payouts/${res.data._id}`)
    },
    onError: (error) => toast.error(errorText(error)),
  })
  return (
    <Modal scrollable open onClose={onClose} title="Generate plot payout">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <p className="text-sm text-text-muted">
          Creates a draft from all unpaid plot commission up to the close date. Nothing is paid until you finalize it.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Start date" htmlFor="gp-start" hint="Day after the last payout. Labels the period only.">
            <Input id="gp-start" type="date" value={periodStart} onChange={(e) => setStartDate(e.target.value)} />
          </FormField>
          <FormField label="Close date" htmlFor="gp-date" hint="This whole day is included.">
            <Input id="gp-date" type="date" value={periodEnd} onChange={(e) => setCloseDate(e.target.value)} />
          </FormField>
        </div>
        {backwards && <p className="text-sm text-danger">The start date is after the close date.</p>}
        {overlaps && previous && (
          <p className="rounded-control border border-warning/40 bg-warning-bg/50 px-3 py-2 text-xs text-text-muted">
            This start overlaps <span className="font-mono">{previous.payoutNo}</span>, which covered {periodLabel(previous)}. Nothing is paid twice — the
            start only labels the period. Use {day(next.data?.data.periodStart)} to follow on cleanly.
          </p>
        )}
        <FormField label="Note" htmlFor="gp-note">
          <Textarea id="gp-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={save.isPending} disabled={backwards || next.isLoading}>
            Generate draft
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** One plot payout: its lines, and finalize / discard (draft) or cancel (finalized). */
export function PlotPayoutDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['plot-payout', id], queryFn: () => fetchPlotPayout(id) })
  const [confirm, setConfirm] = useState<'finalize' | 'discard' | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['plot-payout', id] })
    void queryClient.invalidateQueries({ queryKey: ['plot-payouts'] })
    void queryClient.invalidateQueries({ queryKey: ['plot-commission'] })
  }
  const finalize = useMutation({
    mutationFn: () => finalizePlotPayout(id),
    onSuccess: (res) => {
      toast.success(res.message)
      setConfirm(null)
      refresh()
    },
    onError: (error) => toast.error(errorText(error)),
  })
  const discard = useMutation({
    mutationFn: () => discardPlotPayout(id),
    onSuccess: () => {
      toast.success('Draft discarded')
      refresh()
      navigate('/admin/plot-commission/payouts')
    },
    onError: (error) => toast.error(errorText(error)),
  })
  const cancel = useMutation({
    mutationFn: () => cancelPlotPayout(id, reason),
    onSuccess: (res) => {
      toast.success(res.message)
      setCancelling(false)
      refresh()
    },
    onError: (error) => toast.error(errorText(error)),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }
  const p = data?.data
  if (!p) return <p className="text-sm text-danger">Payout not found.</p>

  return (
    <div className="flex flex-col gap-5 pb-10">
      <PageHeader
        title={`Plot payout ${p.payoutNo}`}
        description={`Period ${periodLabel(p)} · admin charge ${pct(p.rates.adminChargePct)} · TDS ${pct(p.rates.tdsPct)}`}
        actions={
          <>
            <Link to="/admin/plot-commission/payouts">
              <Button variant="secondary">All payouts</Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => downloadPlotPayoutCsv(p._id, p.payoutNo).catch(() => toast.error('Download failed.'))}
            >
              Download (Excel)
            </Button>
            {p.status === 'draft' && (
              <>
                <Button variant="secondary" onClick={() => setConfirm('discard')}>
                  Discard draft
                </Button>
                <Button onClick={() => setConfirm('finalize')}>Finalize</Button>
              </>
            )}
            {p.status === 'finalized' && (
              <Button variant="danger" onClick={() => setCancelling(true)}>
                Cancel payout
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Status" value={p.status} />
        <Stat label="Gross" value={inr(p.totals.gross)} />
        <Stat label="Deductions" value={inr(p.totals.adminCharge + p.totals.tds)} />
        <Stat label="Net payable" value={inr(p.totals.netPayable)} tone="good" />
      </div>
      {p.status === 'cancelled' && (
        <p className="rounded-card border border-border bg-neutral-hover px-4 py-3 text-sm text-text-muted">
          Cancelled {day(p.cancelledAt)} — {p.cancelReason}. Its commission is unpaid again and will join the next payout.
        </p>
      )}

      <DataTable
        minWidth={980}
        head={
          <tr>
            <Th>Associate</Th>
            <Th right>Direct</Th>
            <Th right>Matching</Th>
            <Th right>Reversals</Th>
            <Th right>Gross</Th>
            <Th right>Admin charge</Th>
            <Th right>TDS</Th>
            <Th right>Net payable</Th>
          </tr>
        }
      >
        {(p.lines ?? []).map((l) => (
          <tr key={l.member} className={rowClass}>
            <Td>
              <span className="font-mono text-xs text-text">{l.memberCode}</span>
              <span className="block text-xs text-text-subtle">{l.fullName}</span>
            </Td>
            <Td right>{inr(l.direct)}</Td>
            <Td right>{inr(l.matching)}</Td>
            <Td right className={l.reversals < 0 ? 'text-danger' : 'text-text-muted'}>
              {inr(l.reversals)}
            </Td>
            <Td right>{inr(l.total)}</Td>
            <Td right className="text-text-muted">
              {inr(l.adminCharge)}
            </Td>
            <Td right className="text-text-muted">
              {inr(l.tds)}
            </Td>
            <Td right className="font-semibold text-text">
              {inr(l.netPayable)}
            </Td>
          </tr>
        ))}
      </DataTable>

      <ConfirmModal
        open={confirm === 'finalize'}
        title={`Finalize ${p.payoutNo}?`}
        description="Marks every included commission row as paid. If anything changed since the draft was generated, you'll be asked to generate it again."
        confirmLabel="Finalize payout"
        isLoading={finalize.isPending}
        onConfirm={() => finalize.mutate()}
        onClose={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm === 'discard'}
        title="Discard this draft?"
        description="Nothing was paid; the commission stays unpaid."
        confirmLabel="Discard"
        tone="danger"
        isLoading={discard.isPending}
        onConfirm={() => discard.mutate()}
        onClose={() => setConfirm(null)}
      />
      {cancelling && (
        <Modal scrollable open onClose={() => setCancelling(false)} title={`Cancel ${p.payoutNo}?`} size="sm">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              cancel.mutate()
            }}
          >
            <p className="text-sm text-text-muted">Its commission becomes unpaid again and joins the next plot payout.</p>
            <FormField label="Reason" htmlFor="cp-reason" required>
              <Textarea id="cp-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} required />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCancelling(false)}>
                Keep payout
              </Button>
              <Button type="submit" variant="danger" isLoading={cancel.isPending} disabled={!reason.trim()}>
                Cancel payout
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
