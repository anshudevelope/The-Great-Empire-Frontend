import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { fetchPlacementParents, placeMember } from '@/api/associates'
import type { PlacementParent } from '@/api/associates'
import { ApiRequestError } from '@/api/fetchClient'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { SearchIcon } from '@/components/icons/icons'
import { cn } from '@/lib/cn'

type Leg = 'Left' | 'Right'

/** Just enough to identify who is being placed — a pending row or a referral's member. */
export interface PlaceableMember {
  _id: string
  memberCode: string | null
  fullName: string | null
}

/**
 * The sponsor places a member they referred: a parent (themselves or anyone
 * below them) and a leg. Shared by Place Members and My Referrals.
 *
 * Mount it keyed per member so every opening starts from a clean selection.
 */
export function PlaceMemberDialog({ member, onClose }: { member: PlaceableMember; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')
  const [parent, setParent] = useState<PlacementParent | null>(null)
  const [leg, setLeg] = useState<Leg | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 250)
    return () => clearTimeout(timer)
  }, [term])

  const parents = useQuery({
    queryKey: ['placement-parents', debounced],
    queryFn: () => fetchPlacementParents(debounced),
  })

  const place = useMutation({
    mutationFn: (payload: { parentId: string; position: Leg }) => placeMember(member._id, payload),
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

  const options = parents.data?.data ?? []
  const who = `${member.memberCode ?? '—'} — ${member.fullName ?? ''}`

  return (
    <Modal open onClose={onClose} title={`Place ${who}`} size="lg">
      <div className="flex flex-col gap-5">
        {/* ── Parent ─────────────────────────────────────────────── */}
        <div>
          <p className="text-sm font-medium text-text">1. Parent</p>
          <p className="mb-2 text-xs text-text-subtle">Only members in your own tree with an open leg are listed.</p>
          <div className="relative mb-2">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
            <Input
              className="pl-9"
              placeholder="Search your tree by ID or name…"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
            />
          </div>

          <div className="max-h-64 overflow-y-auto rounded-card border border-border">
            {parents.isLoading ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-text-subtle">
                <Spinner className="h-3.5 w-3.5" /> Loading your tree…
              </div>
            ) : options.length === 0 ? (
              <p className="px-3 py-3 text-sm text-text-subtle">
                {debounced ? 'No match with an open leg.' : 'No open slots found in your tree.'}
              </p>
            ) : (
              options.map((option) => (
                <button
                  key={option._id}
                  type="button"
                  onClick={() => chooseParent(option)}
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-between gap-3 border-b border-border px-3 py-2.5 text-left last:border-0 transition-colors',
                    parent?._id === option._id ? 'bg-blue-50' : 'hover:bg-neutral-hover',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-text">
                      <span className="font-mono text-xs">{option.memberCode}</span> — {option.fullName}
                    </span>
                    <span className="block text-xs text-text-subtle">
                      {option.isSelf
                        ? 'You'
                        : `${option.levelsBelow} level${option.levelsBelow === 1 ? '' : 's'} below you`}
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <LegChip label="L" open={option.leftOpen} />
                    <LegChip label="R" open={option.rightOpen} />
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Leg ────────────────────────────────────────────────── */}
        <div>
          <p className="mb-2 text-sm font-medium text-text">2. Leg</p>
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
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-border-strong bg-white text-text-muted',
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
          {parent && leg ? (
            <>
              {member.memberCode} will be placed under{' '}
              <span className="font-medium">
                {parent.memberCode} — {parent.fullName}
              </span>{' '}
              on the {leg} leg.
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
            disabled={!parent || !leg}
            onClick={() => {
              if (parent && leg) place.mutate({ parentId: parent._id, position: leg })
            }}
          >
            Place member
          </Button>
        </div>
      </div>
    </Modal>
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
