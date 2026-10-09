import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  createBooking,
  fetchPlot,
  fetchPlots,
  previewSchedule,
  type Client,
  type ClientInput,
  type PaymentPlan,
  type Plot,
} from '@/api/plots'
import type { AssociateOption } from '@/api/associates'
import { ApiRequestError } from '@/api/fetchClient'
import { PAYMENT_MODES } from '@/types/referral'
import { AssociateSelect } from '@/components/ui/AssociateSelect'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/cn'
import { FieldGrid, PageHeader, Section } from '../PlotUi'
import { PLAN_LABEL, PLOT_STATUS_TONE, day, inr, instalmentLabel, todayIso } from '../format'
import { usePlotConfig, useProjectOptions } from '../hooks'
import { ClientModal } from './ClientsPage'
import { ClientSelect } from './ClientSelect'

// Set to true to offer "Upline only" again on the Sell page.
const ALLOW_UPLINE_ONLY = false

const errorText = (error: unknown) => (error instanceof ApiRequestError ? error.message : 'Something went wrong.')

// Debounced copy of a value — the schedule preview shouldn't refetch per keystroke.
function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

/**
 * Plot Sales → Sell plot. One page, top to bottom: the plot, the client (found
 * by name, mobile, email or code — or added here), the associate the sale is credited to, the payment
 * plan with a live schedule, and optionally the first payment collected now.
 */
export function SellPlotPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const config = usePlotConfig()

  // --- Plot ---------------------------------------------------------------
  const [plotId, setPlotId] = useState(params.get('plot') ?? '')
  const plotQuery = useQuery({ queryKey: ['plot-plot', plotId], queryFn: () => fetchPlot(plotId), enabled: !!plotId })
  const plot = plotQuery.data?.data ?? null

  // --- Client ---------------------------------------------------------------
  const [client, setClient] = useState<Client | null>(null)
  // Set while the Add client window is open — prefilled from the search text.
  const [newClient, setNewClient] = useState<Partial<ClientInput> | null>(null)
  const startNewClient = (term: string) => {
    const t = term.trim()
    if (/^\d{4,}$/.test(t)) setNewClient({ mobile: t.slice(0, 10) })
    else if (t.includes('@')) setNewClient({ email: t })
    else setNewClient({ fullName: t })
  }

  // --- Associate -----------------------------------------------------------
  const [associate, setAssociate] = useState<AssociateOption | null>(null)
  // '' = upline only (the original behaviour); Left / Right = their own leg.
  const [leg, setLeg] = useState<'' | 'Left' | 'Right'>('')
  // "Upline only" is hidden from the choice for now (ALLOW_UPLINE_ONLY), so
  // the admin must pick the associate's Left or Right leg.
  const legRequired = !!config.data?.selfLeg.enabled && !ALLOW_UPLINE_ONLY

  // --- Plan ------------------------------------------------------------------
  const emiEnabled = config.data?.payment.emi.enabled ?? false
  const oneTimeEnabled = config.data?.payment.oneTime.enabled ?? true
  const [plan, setPlan] = useState<PaymentPlan>('one_time')
  const [downPayment, setDownPayment] = useState('')
  const [tenure, setTenure] = useState('')
  const [bookedOn, setBookedOn] = useState(todayIso())
  const [notes, setNotes] = useState('')
  const activePlan: PaymentPlan = !oneTimeEnabled ? 'emi' : !emiEnabled ? 'one_time' : plan
  const tenureMonths = tenure || String(config.data?.payment.emi.tenures[0] ?? '')

  const previewParams = useDebounced({
    plot: plotId,
    plan: activePlan,
    downPayment: downPayment || '0',
    tenureMonths: activePlan === 'emi' ? tenureMonths : undefined,
    bookedOn,
  })
  const preview = useQuery({
    queryKey: ['plot-schedule-preview', previewParams],
    queryFn: () => previewSchedule(previewParams),
    // Keyed off the debounced params: right after a plot is picked, the
    // debounced copy can still hold the old (empty) plot for a moment.
    enabled: !!previewParams.plot && !!plot && (previewParams.plan === 'one_time' || !!previewParams.tenureMonths),
    retry: false,
  })

  // --- First payment ---------------------------------------------------------
  const [collectNow, setCollectNow] = useState(true)
  const [mode, setMode] = useState('Cash')
  const [reference, setReference] = useState('')
  const [rating, setRating] = useState('')
  const firstRow = preview.data?.data.rows[0]

  const [done, setDone] = useState<{ bookingId: string; code: string; receiptId: string | null; message: string } | null>(null)

  const sell = useMutation({
    mutationFn: () =>
      createBooking({
        plot: plotId,
        client: client!._id,
        associate: associate!._id,
        leg: leg || null,
        plan: activePlan,
        downPayment: activePlan === 'emi' ? Number(downPayment) || 0 : undefined,
        tenureMonths: activePlan === 'emi' ? Number(tenureMonths) : undefined,
        bookedOn,
        notes,
        payNow: collectNow
          ? {
              mode,
              reference,
              paidOn: bookedOn,
              ratingPct: rating === '' ? (config.data?.rating.defaultPct ?? 100) : Number(rating),
            }
          : null,
      }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['plot-plots'] })
      void queryClient.invalidateQueries({ queryKey: ['plot-blocks'] })
      void queryClient.invalidateQueries({ queryKey: ['plot-bookings'] })
      setDone({ bookingId: res.data._id, code: res.data.code, receiptId: res.data.receiptPaymentId, message: res.message })
    },
    onError: (error) => toast.error(errorText(error)),
  })

  const blocker = !plot
    ? 'Choose a plot.'
    : plot.status === 'booked'
      ? 'This plot is already booked.'
      : !client
        ? 'Find or add the client.'
        : !associate
          ? 'Choose the associate this sale is credited to.'
          : legRequired && !leg
            ? "Choose the associate's left or right leg."
          : preview.isError
            ? errorText(preview.error)
            : null

  return (
    <div className="flex flex-col gap-5 pb-10">
      <PageHeader title="Sell plot" description="Book a plot for a client, credited to an associate, with a one-time or EMI payment plan." />

      {/* 1. Plot */}
      <Section title="1 · Plot">
        {plot ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-text">
                {plot.name} <span className="font-mono text-xs font-normal text-text-subtle">{plot.code}</span>
              </p>
              <p className="text-sm text-text-muted">
                {plot.project?.name} · Block {plot.block?.name} · {plot.size} sq.ft{plot.facing ? ` · ${plot.facing}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={PLOT_STATUS_TONE[plot.status]}>{plot.status}</Badge>
              <span className="text-lg font-semibold text-text">{inr(plot.totalPrice)}</span>
              <Button size="sm" variant="secondary" onClick={() => setPlotId('')}>
                Change
              </Button>
            </div>
          </div>
        ) : plotQuery.isLoading ? (
          <Spinner className="h-5 w-5" />
        ) : (
          <PlotPicker onPick={setPlotId} />
        )}
      </Section>

      {/* 2. Client */}
      <Section title="2 · Client">
        <div className="max-w-2xl">
          <FormField label="Client" htmlFor="sp-client" hint="Search existing clients, or add a new one from the list.">
            <ClientSelect id="sp-client" value={client} onChange={setClient} onAddNew={startNewClient} />
          </FormField>
        </div>
      </Section>

      {/* 3. Associate */}
      <Section title="3 · Credited to">
        <div className="max-w-lg">
          <FormField
            label="Associate"
            htmlFor="sp-associate"
            hint={`Earns ${config.data ? `${config.data.commission.direct * 100}%` : ''} direct on every payment; the business counts for their upline's plot matching. Must be approved and placed in the tree.`}
          >
            <AssociateSelect id="sp-associate" value={associate} onChange={setAssociate} role="associate" status="approved" inTree />
          </FormField>
        </div>
        {config.data?.selfLeg.enabled && (
          <div className="mt-5">
            <p className="text-sm font-medium text-text">Place this sale in</p>
            <div
              role="radiogroup"
              aria-label="Leg"
              className={cn('mt-2 grid gap-2', ALLOW_UPLINE_ONLY ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}
            >
              {(
                [
                  ['', 'Upline only', "Counts for their upline's matching, as before."],
                  ['Left', 'Their left leg', 'Counts in their own left leg and up the upline.'],
                  ['Right', 'Their right leg', 'Counts in their own right leg and up the upline.'],
                ] as const
              )
                .filter(([value]) => value !== '' || ALLOW_UPLINE_ONLY)
                .map(([value, label, help]) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={leg === value}
                  onClick={() => setLeg(value)}
                  className={cn(
                    'cursor-pointer rounded-control border px-3 py-2.5 text-left transition-colors',
                    leg === value ? 'border-info bg-info-bg' : 'border-border hover:border-border-strong hover:bg-neutral-hover',
                  )}
                >
                  <span className="block text-sm font-medium text-text">{label}</span>
                  <span className="block text-xs text-text-subtle">{help}</span>
                </button>
              ))}
            </div>
            {leg && associate && (
              <p className="mt-2 text-xs text-text-muted">
                {associate.memberCode} earns direct on this sale and can also earn matching once their left and right plot business pair up.
              </p>
            )}
          </div>
        )}
      </Section>

      {/* 4. Plan */}
      <Section title="4 · Payment plan">
        <FieldGrid columns={4}>
          <FormField label="Plan" htmlFor="sp-plan">
            <Select id="sp-plan" value={activePlan} onChange={(e) => setPlan(e.target.value as PaymentPlan)}>
              {oneTimeEnabled && <option value="one_time">{PLAN_LABEL.one_time}</option>}
              {emiEnabled && <option value="emi">{PLAN_LABEL.emi}</option>}
            </Select>
          </FormField>
          {activePlan === 'emi' && (
            <>
              <FormField label="Down payment (₹)" htmlFor="sp-down" hint="Any amount, including 0.">
                <Input id="sp-down" inputMode="decimal" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} />
              </FormField>
              <FormField label="EMI tenure" htmlFor="sp-tenure">
                <Select id="sp-tenure" value={tenureMonths} onChange={(e) => setTenure(e.target.value)}>
                  {config.data?.payment.emi.tenures.map((m) => (
                    <option key={m} value={m}>
                      {m} months
                    </option>
                  ))}
                </Select>
              </FormField>
            </>
          )}
          <FormField label="Booking date" htmlFor="sp-date">
            <Input id="sp-date" type="date" value={bookedOn} onChange={(e) => setBookedOn(e.target.value)} />
          </FormField>
          <FormField label="Notes" htmlFor="sp-notes" className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <Textarea id="sp-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </FieldGrid>

        {plot && (
          <div className="mt-4">
            {preview.isFetching && !preview.data ? (
              <Spinner className="h-5 w-5" />
            ) : preview.isError ? (
              <p className="text-sm text-danger">{errorText(preview.error)}</p>
            ) : preview.data ? (
              <SchedulePreview
                rows={preview.data.data.rows}
                tenure={preview.data.data.tenureMonths}
                emiAmount={preview.data.data.emiAmount}
                price={preview.data.data.price}
              />
            ) : null}
          </div>
        )}
      </Section>

      {/* 5. First payment */}
      <Section title="5 · First payment">
        <label className="mb-4 flex items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={collectNow} onChange={(e) => setCollectNow(e.target.checked)} className="h-4 w-4 accent-[var(--color-info)]" />
          Collect the first instalment now{firstRow ? ` — ${inr(firstRow.dueAmount)}` : ''}
        </label>
        {collectNow && (
          <FieldGrid columns={3}>
            <FormField label="Mode" htmlFor="sp-mode">
              <Select id="sp-mode" value={mode} onChange={(e) => setMode(e.target.value)}>
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Reference" htmlFor="sp-ref" hint="UPI txn id, cheque no …">
              <Input id="sp-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
            </FormField>
            {config.data?.rating.enabled && (
              <FormField label="Rating %" htmlFor="sp-rating" hint="Share of this payment that earns commission.">
                <Input id="sp-rating" inputMode="decimal" placeholder={String(config.data.rating.defaultPct)} value={rating} onChange={(e) => setRating(e.target.value)} />
              </FormField>
            )}
          </FieldGrid>
        )}
      </Section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {blocker && <p className="text-sm text-text-subtle">{blocker}</p>}
        <Button variant="secondary" onClick={() => navigate('/admin/property/plots')}>
          Cancel
        </Button>
        <Button onClick={() => sell.mutate()} isLoading={sell.isPending} disabled={!!blocker}>
          Book plot
        </Button>
      </div>

      {newClient && (
        <ClientModal client={null} initial={newClient} onClose={() => setNewClient(null)} onSaved={setClient} />
      )}

      {done && (
        <Modal scrollable open onClose={() => navigate(`/admin/plot-sales/bookings/${done.bookingId}`)} title={`Booked · ${done.code}`} size="sm">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-muted">{done.message}</p>
            <div className="flex flex-wrap justify-end gap-2">
              {done.receiptId && (
                <Link to={`/admin/plot-sales/receipts/${done.receiptId}`}>
                  <Button variant="secondary">View receipt</Button>
                </Link>
              )}
              <Link to={`/admin/plot-sales/bookings/${done.bookingId}`}>
                <Button>Open booking</Button>
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function SchedulePreview({
  rows,
  tenure,
  emiAmount,
  price,
}: {
  rows: { kind: 'full' | 'down' | 'emi'; seq: number; dueDate: string; dueAmount: number }[]
  tenure: number
  emiAmount: number
  price: number
}) {
  const [open, setOpen] = useState(false)
  const shown = open ? rows : rows.slice(0, 4)
  return (
    <div className="rounded-control border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-bg px-4 py-2 text-sm">
        <span className="font-medium text-text">
          {rows.length} instalment{rows.length === 1 ? '' : 's'} · total {inr(price)}
        </span>
        {emiAmount > 0 && <span className="text-text-muted">EMI {inr(emiAmount)} / month</span>}
      </div>
      <ul className="divide-y divide-border text-sm">
        {shown.map((r) => (
          <li key={r.seq} className="flex justify-between px-4 py-2">
            <span className="text-text">
              {instalmentLabel(r.kind, r.seq, tenure)} <span className="text-text-subtle">· due {day(r.dueDate)}</span>
            </span>
            <span className="tabular-nums font-medium text-text">{inr(r.dueAmount)}</span>
          </li>
        ))}
      </ul>
      {rows.length > 4 && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="w-full cursor-pointer border-t border-border px-4 py-2 text-sm font-medium text-info hover:bg-neutral-hover">
          {open ? 'Show fewer' : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  )
}

/** Pick a sellable plot: project, then search among its available / held plots. */
function PlotPicker({ onPick }: { onPick: (id: string) => void }) {
  const projects = useProjectOptions()
  const [project, setProject] = useState('')
  const [search, setSearch] = useState('')
  const q = useDebounced(search)
  const { data, isFetching } = useQuery({
    queryKey: ['plot-plots', 'sellable', project, q],
    queryFn: () => fetchPlots({ sellable: 'true', project: project || undefined, search: q || undefined, limit: '12' }),
  })
  const rows: Plot[] = data?.data ?? []

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Select value={project} onChange={(e) => setProject(e.target.value)} containerClassName="w-full sm:w-60" aria-label="Project">
          <option value="">All projects</option>
          {projects.data?.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Input placeholder="Search plot name or code" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64" />
      </div>
      {isFetching && !rows.length ? (
        <Spinner className="h-5 w-5" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-text-subtle">No available or held plots match.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => (
            <button
              key={p._id}
              type="button"
              onClick={() => onPick(p._id)}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-2 rounded-control border border-border px-3 py-2 text-left transition-colors hover:border-border-strong hover:bg-neutral-hover',
              )}
            >
              <span>
                <span className="block text-sm font-medium text-text">{p.name}</span>
                <span className="block text-xs text-text-subtle">
                  {p.project?.name} · {p.size} sq.ft{p.status === 'hold' ? ' · on hold' : ''}
                </span>
              </span>
              <span className="text-sm font-semibold tabular-nums text-text">{inr(p.totalPrice)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
