import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { verifyReferral } from '@/api/referrals'
import { fetchPlacementPreview, redeemReferral } from '@/api/associates'
import type { RedeemResult } from '@/api/associates'
import { ApiRequestError } from '@/api/fetchClient'
import type { VerifiedReferral } from '@/types/referral'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'

type Leg = 'Left' | 'Right'

/**
 * Place a member you referred into your tree.
 *
 * The member already exists — an admin registered them when the referral was
 * raised — so this page never asks for their details. It carries the sponsor
 * (you) and the member; the ONE input you make is which leg, and the spillover
 * result is previewed before you commit so the placement is never a surprise.
 */
export function AddMemberPage() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()

  const [referralNo, setReferralNo] = useState('')
  const [pin, setPin] = useState('')
  const [referral, setReferral] = useState<VerifiedReferral | null>(null)
  const [leg, setLeg] = useState<Leg>('Left')
  const [result, setResult] = useState<RedeemResult | null>(null)

  const verify = useMutation({
    mutationFn: verifyReferral,
    onSuccess: (response) => {
      setReferral(response.data)
      toast.success('Referral verified')
    },
    onError: (error) => {
      setReferral(null)
      toast.error(error instanceof ApiRequestError ? error.message : 'Could not verify this referral.')
    },
  })

  // Live spillover preview: where will this member actually land?
  const { data: preview, isFetching: previewing } = useQuery({
    queryKey: ['placement-preview', leg],
    queryFn: () => fetchPlacementPreview(leg),
    enabled: !!referral,
  })

  const place = useMutation({
    mutationFn: redeemReferral,
    onSuccess: (response) => {
      setResult(response.data)
      queryClient.invalidateQueries({ queryKey: ['referrals'] })
      queryClient.invalidateQueries({ queryKey: ['referral-summary'] })
      queryClient.invalidateQueries({ queryKey: ['binary-tree'] })
      queryClient.invalidateQueries({ queryKey: ['directs'] })
    },
    onError: (error) => {
      toast.error(error instanceof ApiRequestError ? error.message : 'Placement failed.')
    },
  })

  const submit = () => {
    if (!referral) return
    place.mutate({ referralNo: referral.referralNo, pin, position: leg })
  }

  const reset = () => {
    setResult(null)
    setReferral(null)
    setReferralNo('')
    setPin('')
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-text">Place a member</h1>
        <p className="mt-1 text-sm text-text-subtle">
          Enter a referral you were issued and choose a leg. The member is already registered — you are only deciding
          where they sit in your tree.
        </p>
      </header>

      {/* ── 1. Referral ──────────────────────────────────────────────── */}
      <Section step={1} title="Referral" done={!!referral}>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Referral number" htmlFor="referralNo" required>
            <Input
              id="referralNo"
              placeholder="REF-000123"
              value={referralNo}
              onChange={(event) => setReferralNo(event.target.value)}
              disabled={!!referral}
            />
          </FormField>
          <FormField label="PIN" htmlFor="pin" required hint="The 6 digits given to you with the referral">
            <Input
              id="pin"
              inputMode="numeric"
              placeholder="••••••"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              disabled={!!referral}
            />
          </FormField>
          <div className="flex items-end">
            {referral ? (
              <Button variant="secondary" onClick={reset} className="w-full">
                Use a different referral
              </Button>
            ) : (
              <Button
                className="w-full"
                isLoading={verify.isPending}
                disabled={!referralNo || !pin}
                onClick={() => verify.mutate({ referralNo, pin })}
              >
                Verify
              </Button>
            )}
          </div>
        </div>

        {referral && (
          <div className="mt-4 grid gap-3 rounded-card border border-success-border bg-success-bg p-4 sm:grid-cols-4">
            <Line label="Member" value={`${referral.member?.memberCode ?? '—'} — ${referral.member?.name ?? ''}`} />
            <Line label="Tier" value={`${referral.tier} — ${referral.tierLabel}`} />
            <Line label="Amount paid" value={`₹${referral.amountPaid.toLocaleString('en-IN')}`} />
            <Line label="Invoice" value={referral.invoiceNo} mono />
          </div>
        )}
      </Section>

      {/* ── 2. Placement ─────────────────────────────────────────────── */}
      <Section step={2} title="Placement" disabled={!referral}>
        <div className="flex flex-col gap-4">
          <FormField label="Sponsor" htmlFor="sponsor" hint="Taken from the referral — this is you.">
            <div className="flex items-center gap-2 rounded-control border border-border-strong bg-neutral-hover px-3 py-2 text-sm text-text-muted">
              <span className="font-medium text-text">{user?.memberCode}</span>
              <span>— {user?.fullName}</span>
              <span className="ml-auto text-xs">locked</span>
            </div>
          </FormField>

          <FormField label="Leg" htmlFor="leg" required hint="The only placement choice you make.">
            <div className="flex gap-2">
              {(['Left', 'Right'] as Leg[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLeg(option)}
                  className={cn(
                    'flex-1 cursor-pointer rounded-control border px-4 py-2.5 text-sm font-medium transition-colors',
                    leg === option
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-border-strong bg-white text-text-muted hover:bg-neutral-hover',
                  )}
                >
                  {option} leg
                </button>
              ))}
            </div>
          </FormField>

          <div className="rounded-card border border-info-border bg-info-bg p-4 text-sm text-info">
            {previewing ? (
              <span className="flex items-center gap-2">
                <Spinner className="h-3.5 w-3.5" /> Working out placement…
              </span>
            ) : preview ? (
              <>
                <p className="font-medium">
                  Will be placed under {preview.data.parent.memberCode} — {preview.data.parent.fullName}
                </p>
                <p className="mt-1 text-xs">
                  {preview.data.isDirect
                    ? `Directly on your ${leg.toLowerCase()} leg.`
                    : `Your ${leg.toLowerCase()} leg is full, so they spill over to the next open slot — ${preview.data.levelsBelow} levels below you. You remain their sponsor.`}
                </p>
              </>
            ) : (
              <span className="text-xs">Verify a referral to see the placement.</span>
            )}
          </div>
        </div>
      </Section>

      <div className="mt-6 flex justify-end">
        <Button isLoading={place.isPending} disabled={!referral} onClick={submit}>
          Place member
        </Button>
      </div>

      <Modal open={!!result} onClose={reset} title="Member placed" size="lg">
        {result && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Line label="Member code" value={result.memberCode} mono />
              <Line label="Name" value={result.fullName} />
              <Line label="Tier" value={`${result.tier} — ${result.tierLabel}`} />
              <Line label="Sponsor" value={result.sponsor.memberCode} />
              <Line
                label="Placed under"
                value={result.placedUnder ? `${result.placedUnder.memberCode} — ${result.placedUnder.fullName}` : '—'}
              />
              <Line label="Leg" value={`${result.position} · depth ${result.depth}`} />
            </div>

            {result.spilledOver && (
              <p className="rounded-card border border-info-border bg-info-bg p-3 text-xs text-info">
                This member spilled over past a full slot. They sit deeper in the tree, but you remain their sponsor and
                keep the referral credit.
              </p>
            )}

            <div className="flex justify-end">
              <Button onClick={reset}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function Section({
  step,
  title,
  children,
  disabled,
  done,
}: {
  step: number
  title: string
  children: React.ReactNode
  disabled?: boolean
  done?: boolean
}) {
  return (
    <section className={cn('mb-4 rounded-card border border-border bg-white p-6', disabled && 'opacity-50')}>
      <div className="mb-4 flex items-center gap-2.5">
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
            done ? 'bg-success text-white' : 'bg-blue-600 text-white',
          )}
        >
          {done ? '✓' : step}
        </span>
        <h2 className="text-sm font-semibold text-text">{title}</h2>
      </div>
      <fieldset disabled={disabled} className="contents">
        {children}
      </fieldset>
    </section>
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
