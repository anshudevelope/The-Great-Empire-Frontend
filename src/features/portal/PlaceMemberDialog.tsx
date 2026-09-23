import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { fetchPlacementParents, fetchSponsorOptions, placeMember } from '@/api/associates'
import type { PlacementParent, SponsorOption } from '@/api/associates'
import { ApiRequestError } from '@/api/fetchClient'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { cn } from '@/lib/cn'

type Leg = 'Left' | 'Right'

/** Just enough to identify who is being placed — a pending row or a referral's member. */
export interface PlaceableMember {
  _id: string
  memberCode: string | null
  fullName: string | null
}

function useDebounced(value: string, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value.trim()), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const levelLabel = (option: { isSelf: boolean; levelsBelow: number }) =>
  option.isSelf ? 'You' : `${option.levelsBelow} level${option.levelsBelow === 1 ? '' : 's'} below you`

/**
 * The referrer places a member they paid for. Shared by Place Members and
 * My Referrals.
 *
 *   1. Sponsor — who gets the referral credit: you (default) or anyone below you.
 *   2. Parent  — where they sit: you or anyone below you with an open leg.
 *   3. Leg
 *
 * Sponsor and parent are independent searchable selects. The invoice stays with
 * you either way. Mount it keyed per member so every opening starts clean.
 */
export function PlaceMemberDialog({ member, onClose }: { member: PlaceableMember; onClose: () => void }) {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)

  // ── Sponsor ── pre-filled with the signed-in referrer.
  const [sponsor, setSponsor] = useState<SponsorOption | null>(() =>
    user ? { _id: user._id, memberCode: user.memberCode ?? '', fullName: user.fullName, isSelf: true, levelsBelow: 0 } : null,
  )
  const [sponsorTerm, setSponsorTerm] = useState('')
  const sponsorSearch = useDebounced(sponsorTerm)
  const sponsors = useQuery({
    queryKey: ['sponsor-options', sponsorSearch],
    queryFn: () => fetchSponsorOptions(sponsorSearch),
  })

  // ── Parent + leg ──
  const [parentTerm, setParentTerm] = useState('')
  const parentSearch = useDebounced(parentTerm)
  const [parent, setParent] = useState<PlacementParent | null>(null)
  const [leg, setLeg] = useState<Leg | null>(null)
  const parents = useQuery({
    queryKey: ['placement-parents', parentSearch],
    queryFn: () => fetchPlacementParents(parentSearch),
  })

  const place = useMutation({
    mutationFn: (payload: { parentId: string; position: Leg; sponsorId?: string }) => placeMember(member._id, payload),
    onSuccess: (response) => {
      toast.success(response.message)
      for (const key of ['pending-placement', 'placement-parents', 'binary-tree', 'sponsor-tree', 'directs', 'referrals', 'referral-summary', 'legs', 'levels']) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
      onClose()
    },
    onError: (error) => {
      toast.error(error instanceof ApiRequestError ? error.message : 'Placement failed.')
      // A slot taken meanwhile makes the list stale — refresh the open legs.
      queryClient.invalidateQueries({ queryKey: ['placement-parents'] })
    },
  })

  const isOpen = (option: PlacementParent, side: Leg) => (side === 'Left' ? option.leftOpen : option.rightOpen)

  const chooseParent = (option: PlacementParent) => {
    setParent(option)
    // Keep the leg if it's still open here; with exactly one open leg, pick it.
    if (leg && isOpen(option, leg)) return
    if (option.leftOpen !== option.rightOpen) setLeg(option.leftOpen ? 'Left' : 'Right')
    else setLeg(null)
  }

  const who = `${member.memberCode ?? '—'} — ${member.fullName ?? ''}`

  return (
    <Modal open onClose={onClose} title={`Place ${who}`} size="lg">
      <div className="flex flex-col gap-5">
        {/* ── 1. Sponsor ─────────────────────────────────────────── */}
        <div>
          <label htmlFor="place-sponsor" className="text-sm font-medium text-text">
            1. Sponsor
          </label>
          <p className="mb-2 text-xs text-text-subtle">
            Who gets the referral credit — you, or someone in your own tree. It doesn't change where they sit, and the
            invoice stays with you.
          </p>
          <SearchSelect
            id="place-sponsor"
            value={sponsor}
            onChange={setSponsor}
            options={sponsors.data?.data ?? []}
            getKey={(option) => option._id}
            loading={sponsors.isFetching && !sponsors.data}
            search={sponsorTerm}
            onSearchChange={setSponsorTerm}
            searchPlaceholder="Search your tree by ID or name…"
            emptyText="No match in your tree."
            renderValue={(option) => <PersonLine option={option} inline />}
            renderOption={(option) => <PersonLine option={option} />}
          />
        </div>

        {/* ── 2. Parent ──────────────────────────────────────────── */}
        <div>
          <label htmlFor="place-parent" className="text-sm font-medium text-text">
            2. Parent
          </label>
          <p className="mb-2 text-xs text-text-subtle">Where they sit — members in your own tree with an open leg.</p>
          <SearchSelect
            id="place-parent"
            value={parent}
            onChange={chooseParent}
            options={parents.data?.data ?? []}
            getKey={(option) => option._id}
            loading={parents.isFetching && !parents.data}
            search={parentTerm}
            onSearchChange={setParentTerm}
            placeholder="Choose a parent…"
            searchPlaceholder="Search your tree by ID or name…"
            emptyText={parentSearch ? 'No match with an open leg.' : 'No open slots found in your tree.'}
            renderValue={(option) => (
              <span className="flex items-center justify-between gap-3">
                <PersonLine option={option} inline />
                <LegChips option={option} />
              </span>
            )}
            renderOption={(option) => (
              <>
                <PersonLine option={option} />
                <LegChips option={option} />
              </>
            )}
          />
        </div>

        {/* ── 3. Leg ─────────────────────────────────────────────── */}
        <div>
          <p className="mb-2 text-sm font-medium text-text">3. Leg</p>
          <div className="flex gap-2">
            {(['Left', 'Right'] as Leg[]).map((side) => {
              const available = !!parent && isOpen(parent, side)
              return (
                <button
                  key={side}
                  type="button"
                  disabled={!available}
                  onClick={() => setLeg(side)}
                  className={cn(
                    'flex-1 rounded-control border px-4 py-2.5 text-sm font-medium transition-colors',
                    leg === side && available
                      ? 'border-blue-600 bg-info-bg text-info'
                      : 'border-border-strong bg-surface text-text-muted',
                    available ? 'cursor-pointer hover:bg-neutral-hover' : 'cursor-not-allowed opacity-50',
                  )}
                >
                  {side} leg
                  {parent && !isOpen(parent, side) && <span className="ml-1 text-xs">(taken)</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-card border border-info-border bg-info-bg p-3 text-sm text-info">
          {parent && leg && sponsor ? (
            <>
              {member.memberCode} will be sponsored by{' '}
              <span className="font-medium">{sponsor.isSelf ? 'you' : `${sponsor.memberCode} — ${sponsor.fullName}`}</span>{' '}
              and placed under{' '}
              <span className="font-medium">
                {parent.memberCode} — {parent.fullName}
              </span>{' '}
              on the {leg} leg. The invoice stays with you.
            </>
          ) : (
            'Choose a parent and a leg. Until then they stay out of the tree.'
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            isLoading={place.isPending}
            disabled={!parent || !leg || !sponsor}
            onClick={() => {
              if (parent && leg && sponsor) place.mutate({ parentId: parent._id, position: leg, sponsorId: sponsor._id })
            }}
          >
            Place member
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/** "TGE0012 — ram" with "1 level below you" underneath, or on one line when `inline`. */
function PersonLine({
  option,
  inline,
}: {
  option: { memberCode: string; fullName: string; isSelf: boolean; levelsBelow: number }
  inline?: boolean
}) {
  if (inline) {
    return (
      <span className="block min-w-0 truncate text-sm text-text">
        <span className="font-mono text-xs">{option.memberCode}</span> — {option.fullName}
        <span className="ml-1.5 text-xs text-text-subtle">({levelLabel(option)})</span>
      </span>
    )
  }
  return (
    <span className="min-w-0">
      <span className="block truncate text-sm font-medium text-text">
        <span className="font-mono text-xs">{option.memberCode}</span> — {option.fullName}
      </span>
      <span className="block text-xs text-text-subtle">{levelLabel(option)}</span>
    </span>
  )
}

function LegChips({ option }: { option: PlacementParent }) {
  return (
    <span className="flex shrink-0 gap-1">
      <LegChip label="L" open={option.leftOpen} />
      <LegChip label="R" open={option.rightOpen} />
    </span>
  )
}

function LegChip({ label, open }: { label: string; open: boolean }) {
  return (
    <span
      title={open ? 'Open' : 'Taken'}
      className={cn(
        'rounded px-1.5 py-0.5 text-[10px] font-semibold',
        open ? 'bg-success-bg text-success' : 'bg-neutral-hover text-text-subtle line-through',
      )}
    >
      {label}
    </span>
  )
}
