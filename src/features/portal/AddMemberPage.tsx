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
import { Select } from '@/components/ui/Select'
import { FormField } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'

type Leg = 'Left' | 'Right'

/**
 * Redeem a referral voucher to add a new member.
 *
 * The form has no sponsor field and no tier field on purpose: both are carried
 * by the voucher. That leaves exactly ONE tree input — which leg — and the
 * spillover result is previewed before submitting so the placement is never a
 * surprise.
 */
export function AddMemberPage() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()

  const [referralNo, setReferralNo] = useState('')
  const [pin, setPin] = useState('')
  const [voucher, setVoucher] = useState<VerifiedReferral | null>(null)
  const [leg, setLeg] = useState<Leg>('Left')
  const [result, setResult] = useState<{ member: RedeemResult; tempPassword: string } | null>(null)

  const [details, setDetails] = useState({
    title: 'Mr.',
    fullName: '',
    gender: 'Male',
    phone: '',
    email: '',
    dob: '',
    address: '',
    city: '',
    state: 'Uttar Pradesh',
    pinCode: '',
    nomineeName: '',
    nomineeRelation: '',
  })
  const setField = (key: keyof typeof details) => (event: { target: { value: string } }) =>
    setDetails((prev) => ({ ...prev, [key]: event.target.value }))

  const verify = useMutation({
    mutationFn: verifyReferral,
    onSuccess: (response) => {
      setVoucher(response.data)
      toast.success('Referral verified')
    },
    onError: (error) => {
      setVoucher(null)
      toast.error(error instanceof ApiRequestError ? error.message : 'Could not verify this referral.')
    },
  })

  // Live spillover preview: where will this member actually land?
  const { data: preview, isFetching: previewing } = useQuery({
    queryKey: ['placement-preview', leg],
    queryFn: () => fetchPlacementPreview(leg),
    enabled: !!voucher,
  })

  const redeem = useMutation({
    mutationFn: redeemReferral,
    onSuccess: (response) => {
      setResult({ member: response.data, tempPassword: response.tempPassword })
      queryClient.invalidateQueries({ queryKey: ['referrals'] })
      queryClient.invalidateQueries({ queryKey: ['referral-summary'] })
      queryClient.invalidateQueries({ queryKey: ['binary-tree'] })
    },
    onError: (error) => {
      toast.error(error instanceof ApiRequestError ? error.message : 'Registration failed.')
    },
  })

  const submit = () => {
    if (!voucher) return
    const form = new FormData()
    form.append('referralNo', voucher.referralNo)
    form.append('pin', pin)
    form.append('position', leg)
    for (const [key, value] of Object.entries(details)) {
      if (value) form.append(key, value)
    }
    redeem.mutate(form)
  }

  const reset = () => {
    setResult(null)
    setVoucher(null)
    setReferralNo('')
    setPin('')
    setDetails({
      title: 'Mr.', fullName: '', gender: 'Male', phone: '', email: '', dob: '',
      address: '', city: '', state: 'Uttar Pradesh', pinCode: '', nomineeName: '', nomineeRelation: '',
    })
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-text">Add a member</h1>
        <p className="mt-1 text-sm text-text-subtle">
          Enter a referral you were issued, then the new member's details.
        </p>
      </header>

      {/* ── 1. Voucher ───────────────────────────────────────────────── */}
      <Section step={1} title="Referral" done={!!voucher}>
        {voucher ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-success-border bg-success-bg p-4">
            <div className="text-sm text-success">
              <p className="font-medium">{voucher.referralNo} verified</p>
              <p className="mt-0.5">
                {voucher.tier} — {voucher.tierLabel} · ₹{voucher.amountPaid.toLocaleString('en-IN')} · issued to you
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setVoucher(null)}>
              Use another
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <FormField label="Referral number" htmlFor="referralNo" required>
              <Input
                id="referralNo"
                placeholder="REF-000123"
                value={referralNo}
                onChange={(event) => setReferralNo(event.target.value.toUpperCase())}
              />
            </FormField>
            <FormField label="PIN" htmlFor="pin" required>
              <Input
                id="pin"
                inputMode="numeric"
                placeholder="••••••"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
              />
            </FormField>
            <Button
              className="h-10"
              isLoading={verify.isPending}
              onClick={() => verify.mutate({ referralNo, pin })}
              disabled={!referralNo || !pin}
            >
              Verify
            </Button>
          </div>
        )}
      </Section>

      {/* ── 2. Member details ────────────────────────────────────────── */}
      <Section step={2} title="New member details" disabled={!voucher}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <FormField label="Title" htmlFor="title">
            <Select id="title" value={details.title} onChange={setField('title')}>
              {['Mr.', 'Mrs.', 'Ms.', 'Dr.'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Full name" htmlFor="fullName" required>
            <Input id="fullName" value={details.fullName} onChange={setField('fullName')} />
          </FormField>
          <FormField label="Gender" htmlFor="gender">
            <Select id="gender" value={details.gender} onChange={setField('gender')}>
              {['Male', 'Female', 'Other'].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Date of birth" htmlFor="dob">
            <Input id="dob" type="date" value={details.dob} onChange={setField('dob')} />
          </FormField>
          <FormField label="Phone" htmlFor="phone" required>
            <Input id="phone" value={details.phone} onChange={setField('phone')} />
          </FormField>
          <FormField label="Email" htmlFor="email" required>
            <Input id="email" type="email" value={details.email} onChange={setField('email')} />
          </FormField>
          <FormField label="Address" htmlFor="address" className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <Input id="address" value={details.address} onChange={setField('address')} />
          </FormField>
          <FormField label="City" htmlFor="city">
            <Input id="city" value={details.city} onChange={setField('city')} />
          </FormField>
          <FormField label="State" htmlFor="state">
            <Input id="state" value={details.state} onChange={setField('state')} />
          </FormField>
          <FormField label="Nominee name" htmlFor="nomineeName">
            <Input id="nomineeName" value={details.nomineeName} onChange={setField('nomineeName')} />
          </FormField>
          <FormField label="Nominee relation" htmlFor="nomineeRelation">
            <Input id="nomineeRelation" value={details.nomineeRelation} onChange={setField('nomineeRelation')} />
          </FormField>
        </div>
        <p className="mt-4 rounded-card border border-border bg-bg p-3 text-xs text-text-subtle">
          No password field: the system generates a temporary one and shows it to you once. The member must replace it
          at first login, so you never hold their permanent password.
        </p>
      </Section>

      {/* ── 3. Placement ─────────────────────────────────────────────── */}
      <Section step={3} title="Placement" disabled={!voucher}>
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
        <Button
          isLoading={redeem.isPending}
          disabled={!voucher || !details.fullName || !details.email || !details.phone}
          onClick={submit}
        >
          Register member
        </Button>
      </div>

      <Modal open={!!result} onClose={reset} title="Member registered" size="lg">
        {result && (
          <div className="flex flex-col gap-4">
            <div className="rounded-card border border-warning-border bg-warning-bg p-4">
              <p className="text-sm font-medium text-warning">Hand over this temporary password</p>
              <p className="mt-1 text-xs text-warning">
                It is shown only once. {result.member.fullName} must change it at first login.
              </p>
              <p className="mt-3 rounded bg-white px-3 py-2 font-mono text-base font-semibold tracking-wider text-text">
                {result.tempPassword}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Line label="Member code" value={result.member.memberCode} mono />
              <Line label="Name" value={result.member.fullName} />
              <Line label="Tier" value={`${result.member.tier} — ${result.member.tierLabel}`} />
              <Line label="Sponsor" value={result.member.sponsor.memberCode} />
              <Line
                label="Placed under"
                value={result.member.placedUnder ? `${result.member.placedUnder.memberCode} — ${result.member.placedUnder.fullName}` : '—'}
              />
              <Line label="Leg" value={`${result.member.position} · depth ${result.member.depth}`} />
            </div>

            {result.member.spilledOver && (
              <p className="rounded-card border border-info-border bg-info-bg p-3 text-xs text-info">
                This member spilled over past a full slot. They sit deeper in the tree, but you remain their sponsor and
                keep the referral credit.
              </p>
            )}

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    `Member: ${result.member.memberCode}\nEmail: ${result.member.email}\nTemporary password: ${result.tempPassword}`,
                  )
                  toast.success('Copied')
                }}
              >
                Copy login details
              </Button>
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
