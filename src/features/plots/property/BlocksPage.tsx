import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { addBlockPlots, createBlock, deleteBlock, fetchBlocks, updateBlock, type Block, type BlockInput, type RecordStatus } from '@/api/plots'
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
import { PlusIcon } from '@/components/icons/icons'
import { DataTable, PageHeader, Pager, Td, Th } from '../PlotUi'
import { RATE_UNIT_LABEL, inr, plotPrice, rowClass } from '../format'
import { usePlotConfig, useProjectOptions } from '../hooks'

const errorText = (error: unknown) => (error instanceof ApiRequestError ? error.message : 'Something went wrong.')
const projectName = (b: Block) => (typeof b.project === 'string' ? '—' : b.project.name)

/** Property Management → Blocks. Creating a block creates all its plots. */
export function BlocksPage() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const project = params.get('project') ?? ''
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Block | null>(null)
  const [adding, setAdding] = useState<Block | null>(null)
  const [deleting, setDeleting] = useState<Block | null>(null)
  const projects = useProjectOptions()

  const { data, isLoading } = useQuery({
    queryKey: ['plot-blocks', project, search, page],
    queryFn: () => fetchBlocks({ project: project || undefined, search: search || undefined, page: String(page) }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteBlock(id),
    onSuccess: () => {
      toast.success('Block deleted')
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: ['plot-blocks'] })
      void queryClient.invalidateQueries({ queryKey: ['plot-plots'] })
    },
    onError: (error) => toast.error(errorText(error)),
  })

  const rows = data?.data ?? []

  return (
    <div>
      <PageHeader
        title="Blocks"
        description="A block is a batch of identical plots. Saving one creates all its plots, ready to edit, hold or sell."
        actions={
          <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setCreating(true)}>
            Add block
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Select
          value={project}
          onChange={(e) => {
            setParams(e.target.value ? { project: e.target.value } : {})
            setPage(1)
          }}
          containerClassName="w-full sm:w-64"
          aria-label="Project"
        >
          <option value="">All projects</option>
          {projects.data?.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Search code or name"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="w-full sm:w-64"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No blocks yet" description="Add a block to a project to create its plots." />
      ) : (
        <>
          <DataTable
            minWidth={1000}
            head={
              <tr>
                <Th>Code</Th>
                <Th>Block</Th>
                <Th>Project</Th>
                <Th>Plot size</Th>
                <Th right>Rate</Th>
                <Th right>Plot cost</Th>
                <Th right>Plots</Th>
                <Th>Availability</Th>
                <Th />
              </tr>
            }
          >
            {rows.map((b) => (
              <tr key={b._id} className={rowClass}>
                <Td className="font-mono text-xs text-text-muted">{b.code}</Td>
                <Td>
                  <span className="font-medium text-text">{b.name}</span>
                  {b.status === 'inactive' && (
                    <span className="ml-2">
                      <Badge>inactive</Badge>
                    </span>
                  )}
                  {b.remark && <span className="block text-xs text-text-subtle">{b.remark}</span>}
                </Td>
                <Td className="text-text-muted">{projectName(b)}</Td>
                <Td className="text-text-muted">
                  {b.plotWidth} × {b.plotLength} ft
                  <span className="block text-xs text-text-subtle">{b.plotSize} sq.ft</span>
                </Td>
                <Td right className="text-text-muted">
                  {inr(b.rate)}
                  <span className="block text-xs text-text-subtle">{RATE_UNIT_LABEL[b.rateUnit]}</span>
                </Td>
                <Td right className="font-medium text-text">
                  {inr(b.plotCost)}
                </Td>
                <Td right>{b.counts.total}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <Badge tone="success">{b.counts.available} available</Badge>
                    {b.counts.hold > 0 && <Badge tone="warning">{b.counts.hold} hold</Badge>}
                    {b.counts.booked > 0 && <Badge tone="info">{b.counts.booked} booked</Badge>}
                  </div>
                </Td>
                <Td right>
                  <div className="flex justify-end gap-1">
                    <Link to={`/admin/property/plots?block=${b._id}&project=${typeof b.project === 'string' ? b.project : b.project._id}`}>
                      <Button size="sm" variant="ghost">
                        Plots
                      </Button>
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => setAdding(b)}>
                      Add plots
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(b)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(b)}>
                      Delete
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </DataTable>
          {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
        </>
      )}

      {creating && <CreateBlockModal defaultProject={project} onClose={() => setCreating(false)} />}
      {editing && <EditBlockModal block={editing} onClose={() => setEditing(null)} />}
      {adding && <AddPlotsModal block={adding} onClose={() => setAdding(null)} />}

      <ConfirmModal
        open={!!deleting}
        title={`Delete block ${deleting?.name ?? ''}?`}
        description="This also deletes its plots. Only possible while every plot is available and none was ever sold — otherwise mark the block inactive."
        confirmLabel="Delete block"
        tone="danger"
        isLoading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting._id)}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}

function CreateBlockModal({ defaultProject, onClose }: { defaultProject: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const projects = useProjectOptions()
  const config = usePlotConfig()
  const [form, setForm] = useState<BlockInput>({
    project: defaultProject,
    name: '',
    plotWidth: '',
    plotLength: '',
    rate: '',
    rateUnit: 'per_sqft',
    plotCount: '',
    startSerial: '1',
    remark: '',
  })
  const set = (key: keyof BlockInput) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const width = Number(form.plotWidth) || 0
  const length = Number(form.plotLength) || 0
  const size = Math.round(width * length * 100) / 100
  const cost = plotPrice(size, Number(form.rate) || 0, form.rateUnit)
  const count = Number(form.plotCount) || 0
  const start = Number(form.startSerial) || 1
  const name = form.name.trim() || 'Block'

  const save = useMutation({
    mutationFn: () => createBlock(form),
    onSuccess: (res) => {
      toast.success(`Block ${res.data.name} created with ${res.data.plotCount} plots`)
      void queryClient.invalidateQueries({ queryKey: ['plot-blocks'] })
      void queryClient.invalidateQueries({ queryKey: ['plot-plots'] })
      onClose()
    },
    onError: (error) => toast.error(errorText(error)),
  })

  return (
    <Modal scrollable open onClose={onClose} title="Add block" size="lg">
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <FormField label="Project" htmlFor="bl-project" required>
          <Select id="bl-project" value={form.project} onChange={set('project')} required>
            <option value="">Select project</option>
            {projects.data?.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Block name" htmlFor="bl-name" required hint={`Plots are named after it: ${name}-${start}, ${name}-${start + 1} …`}>
          <Input id="bl-name" value={form.name} onChange={set('name')} required />
        </FormField>
        <FormField label="Plot width (ft)" htmlFor="bl-width" required>
          <Input id="bl-width" inputMode="decimal" value={form.plotWidth} onChange={set('plotWidth')} required />
        </FormField>
        <FormField label="Plot length (ft)" htmlFor="bl-length" required>
          <Input id="bl-length" inputMode="decimal" value={form.plotLength} onChange={set('plotLength')} required />
        </FormField>
        <FormField label="Rate (₹)" htmlFor="bl-rate" required>
          <Input id="bl-rate" inputMode="decimal" value={form.rate} onChange={set('rate')} required />
        </FormField>
        <FormField label="Rate is" htmlFor="bl-unit">
          <Select id="bl-unit" value={form.rateUnit} onChange={set('rateUnit')}>
            <option value="per_sqft">Per sq.ft</option>
            <option value="per_plot">Per plot</option>
          </Select>
        </FormField>
        <FormField
          label="Number of plots"
          htmlFor="bl-count"
          required
          hint={config.data ? `Up to ${config.data.maxPlotsPerCall} at a time.` : undefined}
        >
          <Input id="bl-count" inputMode="numeric" value={form.plotCount} onChange={set('plotCount')} required />
        </FormField>
        <FormField label="First serial number" htmlFor="bl-start">
          <Input id="bl-start" inputMode="numeric" value={form.startSerial} onChange={set('startSerial')} />
        </FormField>
        <FormField label="Remark" htmlFor="bl-remark" className="sm:col-span-2">
          <Textarea id="bl-remark" rows={2} value={form.remark} onChange={set('remark')} />
        </FormField>

        <div className="rounded-control border border-info-border bg-info-bg px-4 py-3 text-sm text-text sm:col-span-2">
          Plot size <strong>{size || 0} sq.ft</strong> · plot cost <strong>{inr(cost)}</strong>
          {count > 0 && (
            <span className="block text-text-muted">
              Will create {count} plot{count === 1 ? '' : 's'}: {name}-{start}
              {count > 1 && ` … ${name}-${start + count - 1}`}
            </span>
          )}
        </div>

        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={save.isPending}>
            Create block
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function EditBlockModal({ block, onClose }: { block: Block; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(block.name)
  const [remark, setRemark] = useState(block.remark)
  const [status, setStatus] = useState<RecordStatus>(block.status)

  const save = useMutation({
    mutationFn: () => updateBlock(block._id, { name, remark, status }),
    onSuccess: () => {
      toast.success('Block updated')
      void queryClient.invalidateQueries({ queryKey: ['plot-blocks'] })
      onClose()
    },
    onError: (error) => toast.error(errorText(error)),
  })

  return (
    <Modal scrollable open onClose={onClose} title={`Edit ${block.code}`}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <p className="text-xs text-text-subtle">
          Size and rate are fixed once plots exist — change a plot's price on the plot itself.
        </p>
        <FormField label="Block name" htmlFor="eb-name" required>
          <Input id="eb-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </FormField>
        <FormField label="Remark" htmlFor="eb-remark">
          <Textarea id="eb-remark" rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} />
        </FormField>
        <FormField label="Status" htmlFor="eb-status">
          <Select id="eb-status" value={status} onChange={(e) => setStatus(e.target.value as RecordStatus)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </FormField>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={save.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function AddPlotsModal({ block, onClose }: { block: Block; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [count, setCount] = useState('')
  const n = Number(count) || 0

  const save = useMutation({
    mutationFn: () => addBlockPlots(block._id, n),
    onSuccess: (res) => {
      toast.success(res.message)
      void queryClient.invalidateQueries({ queryKey: ['plot-blocks'] })
      void queryClient.invalidateQueries({ queryKey: ['plot-plots'] })
      onClose()
    },
    onError: (error) => toast.error(errorText(error)),
  })

  return (
    <Modal scrollable open onClose={onClose} title={`Add plots to ${block.name}`} size="sm">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <FormField
          label="How many plots"
          htmlFor="ap-count"
          required
          hint={n > 0 ? `${block.name}-${block.nextSerial} … ${block.name}-${block.nextSerial + n - 1}, at ${inr(block.plotCost)} each` : undefined}
        >
          <Input id="ap-count" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} required />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={save.isPending} disabled={n < 1}>
            Add plots
          </Button>
        </div>
      </form>
    </Modal>
  )
}
