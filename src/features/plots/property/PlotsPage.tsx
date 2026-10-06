import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { fetchPlots, holdPlot, unholdPlot, updatePlot, type Plot, type PlotStatus, type RateUnit, type RecordStatus } from '@/api/plots'
import { ApiRequestError } from '@/api/fetchClient'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Textarea } from '@/components/ui/Textarea'
import { DataTable, PageHeader, Pager, TabStrip, Td, Th } from '../PlotUi'
import { PLOT_STATUS_TONE, RATE_UNIT_LABEL, day, inr, plotPrice, rowClass } from '../format'
import { useBlockOptions, usePlotConfig, useProjectOptions } from '../hooks'

const errorText = (error: unknown) => (error instanceof ApiRequestError ? error.message : 'Something went wrong.')
type Tab = 'all' | PlotStatus

/** Property Management → Plots: every plot, its price and status; hold, edit or sell. */
export function PlotsPage() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const project = params.get('project') ?? ''
  const block = params.get('block') ?? ''
  const [tab, setTab] = useState<Tab>('all')
  const [facing, setFacing] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Plot | null>(null)
  const [holding, setHolding] = useState<Plot | null>(null)
  const [releasing, setReleasing] = useState<Plot | null>(null)

  const projects = useProjectOptions()
  const blocks = useBlockOptions(project || undefined)
  const config = usePlotConfig()

  const filters = {
    project: project || undefined,
    block: block || undefined,
    status: tab === 'all' ? undefined : tab,
    facing: facing || undefined,
    search: search || undefined,
    page: String(page),
  }
  const { data, isLoading } = useQuery({ queryKey: ['plot-plots', filters], queryFn: () => fetchPlots(filters) })

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['plot-plots'] })
    void queryClient.invalidateQueries({ queryKey: ['plot-blocks'] })
  }

  const unhold = useMutation({
    mutationFn: (id: string) => unholdPlot(id),
    onSuccess: (res) => {
      toast.success(res.message ?? 'Plot released')
      setReleasing(null)
      refresh()
    },
    onError: (error) => toast.error(errorText(error)),
  })

  const setFilter = (next: Record<string, string>) => {
    const merged = { project, block, ...next }
    setParams(Object.fromEntries(Object.entries(merged).filter(([, v]) => v)))
    setPage(1)
  }

  const s = data?.summary ?? {}
  const all = (s.available ?? 0) + (s.hold ?? 0) + (s.booked ?? 0)
  const rows = data?.data ?? []

  return (
    <div>
      <PageHeader title="Plots" description="Every plot with its price and status. Set premiums, hold a plot for someone, or sell it." />

      <div className="mb-3 flex flex-wrap gap-2">
        <Select value={project} onChange={(e) => setFilter({ project: e.target.value, block: '' })} containerClassName="w-full sm:w-60" aria-label="Project">
          <option value="">All projects</option>
          {projects.data?.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select value={block} onChange={(e) => setFilter({ block: e.target.value })} disabled={!project} containerClassName="w-full sm:w-48" aria-label="Block">
          <option value="">{project ? 'All blocks' : 'Choose a project first'}</option>
          {blocks.data?.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </Select>
        <Select
          value={facing}
          onChange={(e) => {
            setFacing(e.target.value)
            setPage(1)
          }}
          containerClassName="w-full sm:w-44"
          aria-label="Facing"
        >
          <option value="">Any facing</option>
          {config.data?.facings.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Search plot code or name"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="w-full sm:w-60"
        />
      </div>

      <TabStrip<Tab>
        value={tab}
        onChange={(value) => {
          setTab(value)
          setPage(1)
        }}
        tabs={[
          { value: 'all', label: 'All', count: all },
          { value: 'available', label: 'Available', count: s.available ?? 0 },
          { value: 'hold', label: 'Hold', count: s.hold ?? 0 },
          { value: 'booked', label: 'Booked', count: s.booked ?? 0 },
        ]}
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No plots here" description="Create a block to generate plots, or change the filters." />
      ) : (
        <>
          <DataTable
            minWidth={1100}
            head={
              <tr>
                <Th>Plot</Th>
                <Th>Project / block</Th>
                <Th>Size</Th>
                <Th right>Base price</Th>
                <Th right>Premium</Th>
                <Th right>Total price</Th>
                <Th>Facing</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            }
          >
            {rows.map((p) => (
              <tr key={p._id} className={rowClass}>
                <Td>
                  <span className="font-medium text-text">{p.name}</span>
                  <span className="block font-mono text-xs text-text-subtle">{p.code}</span>
                </Td>
                <Td className="text-text-muted">
                  {p.project?.name}
                  <span className="block text-xs text-text-subtle">Block {p.block?.name}</span>
                </Td>
                <Td className="text-text-muted">
                  {p.width} × {p.length} ft
                  <span className="block text-xs text-text-subtle">
                    {p.size} sq.ft · {inr(p.rate)} {RATE_UNIT_LABEL[p.rateUnit]}
                  </span>
                </Td>
                <Td right className="text-text-muted">
                  {inr(p.basePrice)}
                </Td>
                <Td right className="text-text-muted">
                  {p.extraPct || p.extraAmount ? (
                    <>
                      {p.extraPct ? `+${p.extraPct}%` : ''}
                      {p.extraPct && p.extraAmount ? ' · ' : ''}
                      {p.extraAmount ? `+${inr(p.extraAmount)}` : ''}
                    </>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td right className="font-semibold text-text">
                  {inr(p.totalPrice)}
                </Td>
                <Td className="text-text-muted">{p.facing || '—'}</Td>
                <Td>
                  <Badge tone={p.recordStatus === 'inactive' ? 'neutral' : PLOT_STATUS_TONE[p.status]}>
                    {p.recordStatus === 'inactive' ? 'inactive' : p.status}
                  </Badge>
                  {p.status === 'hold' && p.hold?.note && (
                    <span className="mt-1 block max-w-40 truncate text-xs text-text-subtle" title={p.hold.note}>
                      {p.hold.note}
                    </span>
                  )}
                  {p.status === 'booked' && p.currentBooking && (
                    <span className="mt-1 block text-xs text-text-subtle">
                      {p.currentBooking.client?.fullName} · {day(p.currentBooking.bookedOn)}
                    </span>
                  )}
                </Td>
                <Td right>
                  <div className="flex justify-end gap-1">
                    {p.status !== 'booked' && p.recordStatus === 'active' && (
                      <Link to={`/admin/plot-sales/sell?plot=${p._id}`}>
                        <Button size="sm" variant="info">
                          Sell
                        </Button>
                      </Link>
                    )}
                    {p.status === 'available' && p.recordStatus === 'active' && (
                      <Button size="sm" variant="ghost" onClick={() => setHolding(p)}>
                        Hold
                      </Button>
                    )}
                    {p.status === 'hold' && (
                      <Button size="sm" variant="ghost" onClick={() => setReleasing(p)}>
                        Unhold
                      </Button>
                    )}
                    {p.status === 'booked' && p.currentBooking && (
                      <Link to={`/admin/plot-sales/bookings/${p.currentBooking._id}`}>
                        <Button size="sm" variant="ghost">
                          Booking
                        </Button>
                      </Link>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                      Edit
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </DataTable>
          {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
        </>
      )}

      {editing && <EditPlotModal plot={editing} facings={config.data?.facings ?? []} onClose={() => setEditing(null)} onSaved={refresh} />}
      {holding && <HoldModal plot={holding} onClose={() => setHolding(null)} onSaved={refresh} />}
      <ConfirmModal
        open={!!releasing}
        title={`Release ${releasing?.name ?? 'plot'}?`}
        description="The plot goes back to Available and can be held or sold by anyone."
        confirmLabel="Unhold"
        isLoading={unhold.isPending}
        onConfirm={() => releasing && unhold.mutate(releasing._id)}
        onClose={() => setReleasing(null)}
      />
    </div>
  )
}

function EditPlotModal({ plot, facings, onClose, onSaved }: { plot: Plot; facings: string[]; onClose: () => void; onSaved: () => void }) {
  const priceEditable = plot.status === 'available'
  const [form, setForm] = useState({
    name: plot.name,
    facing: plot.facing,
    remark: plot.remark,
    recordStatus: plot.recordStatus,
    width: String(plot.width),
    length: String(plot.length),
    rate: String(plot.rate),
    rateUnit: plot.rateUnit,
    extraPct: String(plot.extraPct || ''),
    extraAmount: String(plot.extraAmount || ''),
  })
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const size = (Number(form.width) || 0) * (Number(form.length) || 0)
  const total = plotPrice(size, Number(form.rate) || 0, form.rateUnit, Number(form.extraPct) || 0, Number(form.extraAmount) || 0)

  const save = useMutation({
    mutationFn: () =>
      updatePlot(plot._id, {
        name: form.name,
        facing: form.facing,
        remark: form.remark,
        recordStatus: form.recordStatus,
        ...(priceEditable
          ? {
              width: Number(form.width) || 0,
              length: Number(form.length) || 0,
              rate: Number(form.rate) || 0,
              rateUnit: form.rateUnit,
              extraPct: Number(form.extraPct) || 0,
              extraAmount: Number(form.extraAmount) || 0,
            }
          : {}),
      }),
    onSuccess: () => {
      toast.success('Plot updated')
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(errorText(error)),
  })

  return (
    <Modal scrollable open onClose={onClose} title={`Edit ${plot.name} (${plot.code})`} size="lg">
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <FormField label="Plot name" htmlFor="ep-name" required>
          <Input id="ep-name" value={form.name} onChange={set('name')} required />
        </FormField>
        <FormField label="Facing" htmlFor="ep-facing">
          <Select id="ep-facing" value={form.facing} onChange={set('facing')}>
            <option value="">Not set</option>
            {facings.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </FormField>

        {!priceEditable && (
          <p className="rounded-control bg-warning-bg px-3 py-2 text-xs text-warning sm:col-span-2">
            Price can only change while the plot is available. This plot is {plot.status}.
          </p>
        )}
        <FormField label="Width (ft)" htmlFor="ep-width">
          <Input id="ep-width" inputMode="decimal" value={form.width} onChange={set('width')} disabled={!priceEditable} />
        </FormField>
        <FormField label="Length (ft)" htmlFor="ep-length">
          <Input id="ep-length" inputMode="decimal" value={form.length} onChange={set('length')} disabled={!priceEditable} />
        </FormField>
        <FormField label="Rate (₹)" htmlFor="ep-rate">
          <Input id="ep-rate" inputMode="decimal" value={form.rate} onChange={set('rate')} disabled={!priceEditable} />
        </FormField>
        <FormField label="Rate is" htmlFor="ep-unit">
          <Select id="ep-unit" value={form.rateUnit} onChange={(e) => setForm((f) => ({ ...f, rateUnit: e.target.value as RateUnit }))} disabled={!priceEditable}>
            <option value="per_sqft">Per sq.ft</option>
            <option value="per_plot">Per plot</option>
          </Select>
        </FormField>
        <FormField label="Premium %" htmlFor="ep-pct" hint="e.g. 10 for a corner plot.">
          <Input id="ep-pct" inputMode="decimal" value={form.extraPct} onChange={set('extraPct')} disabled={!priceEditable} />
        </FormField>
        <FormField label="Extra amount (₹)" htmlFor="ep-extra">
          <Input id="ep-extra" inputMode="decimal" value={form.extraAmount} onChange={set('extraAmount')} disabled={!priceEditable} />
        </FormField>
        <FormField label="Remark" htmlFor="ep-remark" className="sm:col-span-2">
          <Textarea id="ep-remark" rows={2} value={form.remark} onChange={set('remark')} />
        </FormField>
        <FormField label="Status" htmlFor="ep-status">
          <Select id="ep-status" value={form.recordStatus} onChange={(e) => setForm((f) => ({ ...f, recordStatus: e.target.value as RecordStatus }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive (not for sale)</option>
          </Select>
        </FormField>
        <div className="flex items-end">
          <p className="text-sm text-text">
            Total price <strong className="text-lg">{inr(total)}</strong>
          </p>
        </div>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={save.isPending}>
            Save plot
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function HoldModal({ plot, onClose, onSaved }: { plot: Plot; onClose: () => void; onSaved: () => void }) {
  const [note, setNote] = useState('')
  const save = useMutation({
    mutationFn: () => holdPlot(plot._id, note),
    onSuccess: (res) => {
      toast.success(res.message ?? 'Plot on hold')
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(errorText(error)),
  })
  return (
    <Modal scrollable open onClose={onClose} title={`Hold ${plot.name}`} size="sm">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <p className="text-sm text-text-muted">
          A held plot can't be held again; it can still be sold. It stays held until you sell or unhold it.
        </p>
        <FormField label="Held for" htmlFor="hold-note" required hint="Who it's reserved for, or why.">
          <Textarea id="hold-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} required />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="warning" isLoading={save.isPending} disabled={!note.trim()}>
            Hold plot
          </Button>
        </div>
      </form>
    </Modal>
  )
}
