import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  approveRewardClaim,
  fetchRewardClaims,
  rejectRewardClaim,
  type RewardClaim,
  type RewardClaimStatus,
} from '@/api/rewards'
import { ApiRequestError } from '@/api/fetchClient'
import { useActiveBusiness } from '@/store/businessStore'
import { formatShortDate } from '@/lib/datetime'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { Textarea } from '@/components/ui/Textarea'
import { DataTable, PageHeader, Pager, TabStrip, Td, Th } from '@/features/plots/PlotUi'
import { ClaimBadge } from '@/features/portal/RewardPlan'
import { inr } from '@/features/portal/rewardFormat'

type View = RewardClaimStatus | 'all'

const errorText = (error: unknown) => (error instanceof ApiRequestError ? error.message : 'Something went wrong.')

const memberOf = (c: RewardClaim) => (typeof c.associate === 'object' ? c.associate : null)

/**
 * Rewards → Claims: associates claim a reward once they reach its target; the
 * admin approves (the reward is then handed over outside the system) or
 * rejects with a reason, which gives the associate their progress back.
 */
export function RewardClaimsPage() {
  const business = useActiveBusiness()
  const [view, setView] = useState<View>('pending')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deciding, setDeciding] = useState<{ claim: RewardClaim; approve: boolean } | null>(null)

  const filters = { status: view === 'all' ? undefined : view, search: search || undefined, page: String(page) }
  const { data, isLoading } = useQuery({
    queryKey: ['reward-claims', business, filters],
    queryFn: () => fetchRewardClaims(filters),
  })
  const rows = data?.data ?? []
  const s = data?.summary

  return (
    <div>
      <PageHeader
        title="Reward claims"
        description="Associates claim a reward when they reach its target. Approve once the company accepts it — the reward itself is handed over outside the system."
      />

      <TabStrip<View>
        value={view}
        onChange={(v) => {
          setView(v)
          setPage(1)
        }}
        tabs={[
          { value: 'pending', label: 'Pending', count: s?.pending },
          { value: 'approved', label: 'Approved', count: s?.approved },
          { value: 'rejected', label: 'Rejected', count: s?.rejected },
          { value: 'all', label: 'All', count: s ? s.pending + s.approved + s.rejected : undefined },
        ]}
      />

      <div className="mb-4">
        <Input
          placeholder="Search associate ID or reward"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="w-full sm:w-72"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title={view === 'pending' ? 'No claims waiting' : 'No claims'}
          description={view === 'pending' ? 'New claims from associates appear here.' : 'Nothing matches these filters.'}
        />
      ) : (
        <>
          <DataTable
            minWidth={740}
            head={
              <tr>
                <Th>Associate</Th>
                <Th>Step</Th>
                <Th>Reward</Th>
                <Th right>Matched / target</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            }
          >
            {rows.map((c) => {
              const m = memberOf(c)
              return (
                <tr key={c._id} className="border-b border-border last:border-0 hover:bg-neutral-hover/60">
                  <Td>
                    {m ? (
                      <Link to={`/admin/associates/${m._id}`} className="font-mono text-xs font-medium text-info hover:underline">
                        {c.memberCode}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs">{c.memberCode}</span>
                    )}
                    <span className="block text-xs text-text-subtle">{m?.fullName}</span>
                  </Td>
                  <Td>
                    <span className="whitespace-nowrap text-text">{c.stepLabel}</span>
                    <span className="block whitespace-nowrap text-xs text-text-subtle">claimed {formatShortDate(c.createdAt)}</span>
                  </Td>
                  <Td>
                    <span className="font-medium text-text">{c.reward}</span>
                    <span className="block text-xs text-text-subtle">{inr(c.rewardValue)}</span>
                  </Td>
                  <Td right>
                    <span className="whitespace-nowrap text-text">{inr(c.matched)}</span>
                    <span className="block whitespace-nowrap text-xs text-text-subtle">of {inr(c.target)} each leg</span>
                  </Td>
                  <Td>
                    <ClaimBadge status={c.status} />
                    {c.decision.at && (
                      <span className="mt-0.5 block text-xs text-text-subtle">
                        {formatShortDate(c.decision.at)}
                        {c.decision.note ? ` · ${c.decision.note}` : ''}
                      </span>
                    )}
                  </Td>
                  <Td right>
                    {c.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="solidSuccess" onClick={() => setDeciding({ claim: c, approve: true })}>
                          Approve
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setDeciding({ claim: c, approve: false })}>
                          Reject
                        </Button>
                      </div>
                    )}
                  </Td>
                </tr>
              )
            })}
          </DataTable>
          {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
        </>
      )}

      {deciding && <DecideModal claim={deciding.claim} approve={deciding.approve} onClose={() => setDeciding(null)} />}
    </div>
  )
}

function DecideModal({ claim, approve, onClose }: { claim: RewardClaim; approve: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')
  const save = useMutation({
    mutationFn: () => (approve ? approveRewardClaim(claim._id, note) : rejectRewardClaim(claim._id, note)),
    onSuccess: (res) => {
      toast.success(res.message)
      void queryClient.invalidateQueries({ queryKey: ['reward-claims'] })
      onClose()
    },
    onError: (error) => toast.error(errorText(error)),
  })
  const who = `${claim.memberCode}${memberOf(claim)?.fullName ? ` · ${memberOf(claim)?.fullName}` : ''}`

  return (
    <Modal open onClose={onClose} title={`${approve ? 'Approve' : 'Reject'} ${claim.reward}?`} size="sm">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <p className="text-sm text-text-muted">
          {who} claimed <strong className="text-text">{claim.reward}</strong> ({inr(claim.rewardValue)}) for {claim.stepLabel}, with{' '}
          {inr(claim.matched)} matched against a target of {inr(claim.target)} on each leg.
        </p>
        <p className="text-sm text-text-muted">
          {approve
            ? 'Approving records that the company accepts this claim. Hand the reward over as usual.'
            : 'Rejecting gives the associate their progress back, and they can claim this step again.'}
        </p>
        <FormField label={approve ? 'Note' : 'Reason'} htmlFor="rc-note" required={!approve}>
          <Textarea
            id="rc-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={approve ? 'Optional' : 'Shown to the associate'}
            required={!approve}
          />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={approve ? 'solidSuccess' : 'danger'}
            isLoading={save.isPending}
            disabled={!approve && !note.trim()}
          >
            {approve ? 'Approve' : 'Reject'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
