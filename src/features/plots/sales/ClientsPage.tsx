import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createClient, fetchClients, updateClient, type Client, type ClientInput } from '@/api/plots'
import { ApiRequestError } from '@/api/fetchClient'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Textarea } from '@/components/ui/Textarea'
import { PlusIcon } from '@/components/icons/icons'
import { DataTable, PageHeader, Pager, Td, Th } from '../PlotUi'
import { day, isoDay, rowClass } from '../format'

const errorText = (error: unknown) => (error instanceof ApiRequestError ? error.message : 'Something went wrong.')

const blankClient: ClientInput = {
  title: '',
  fullName: '',
  guardianName: '',
  gender: '',
  dob: '',
  mobile: '',
  email: '',
  address: '',
  city: '',
  state: 'Uttar Pradesh',
  pinCode: '',
  idProof: { type: '', number: '', file: '' },
  notes: '',
  status: 'active',
}

const toInput = (c: Client): ClientInput => ({
  ...blankClient,
  ...c,
  dob: isoDay(c.dob),
  idProof: { type: c.idProof?.type ?? '', number: c.idProof?.number ?? '', file: c.idProof?.file?.url ?? '' },
})

/** Plot Sales → Clients: plot buyers. Managed here, never placed in the tree. */
export function ClientsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Client | 'new' | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['plot-clients', search, page],
    queryFn: () => fetchClients({ search: search || undefined, page: String(page) }),
  })
  const rows = data?.data ?? []

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Plot buyers. They are not placed in the tree — each sale is credited to an associate instead."
        actions={
          <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setEditing('new')}>
            Add client
          </Button>
        }
      />
      <div className="mb-4">
        <Input
          placeholder="Search code, name, mobile or email"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="w-full sm:w-80"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No clients yet" description="Add a client here, or while selling a plot." />
      ) : (
        <>
          <DataTable
            head={
              <tr>
                <Th>Code</Th>
                <Th>Client</Th>
                <Th>Mobile</Th>
                <Th>City</Th>
                <Th>Added</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            }
          >
            {rows.map((c) => (
              <tr key={c._id} className={rowClass}>
                <Td className="font-mono text-xs text-text-muted">{c.code}</Td>
                <Td>
                  <span className="font-medium text-text">
                    {c.title ? `${c.title} ` : ''}
                    {c.fullName}
                  </span>
                  {c.guardianName && <span className="block text-xs text-text-subtle">C/o {c.guardianName}</span>}
                </Td>
                <Td className="text-text-muted">
                  {c.mobile}
                  {c.email && <span className="block text-xs text-text-subtle">{c.email}</span>}
                </Td>
                <Td className="text-text-muted">{c.city || '—'}</Td>
                <Td className="text-text-muted">{day(c.createdAt)}</Td>
                <Td>
                  <Badge tone={c.status === 'active' ? 'success' : 'neutral'}>{c.status}</Badge>
                </Td>
                <Td right>
                  <div className="flex justify-end gap-1">
                    <Link to={`/admin/plot-sales/bookings?client=${c._id}`}>
                      <Button size="sm" variant="ghost">
                        Bookings
                      </Button>
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
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

      {editing && <ClientModal client={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

/** Add / edit a client. Also used by Sell Plot to create one inline. */
export function ClientModal({
  client,
  initial,
  onClose,
  onSaved,
}: {
  client: Client | null
  /** Prefill for a new client — e.g. what was typed in the Sell page search. */
  initial?: Partial<ClientInput>
  onClose: () => void
  onSaved?: (client: Client) => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ClientInput>(() => (client ? toInput(client) : { ...blankClient, ...initial }))
  const set = (key: keyof ClientInput) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setProof = (key: keyof ClientInput['idProof']) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, idProof: { ...f.idProof, [key]: e.target.value } }))

  const save = useMutation({
    mutationFn: () => (client ? updateClient(client._id, form) : createClient(form)),
    onSuccess: (res) => {
      toast.success(client ? 'Client updated' : `Client ${res.data.code} added`)
      void queryClient.invalidateQueries({ queryKey: ['plot-clients'] })
      onSaved?.(res.data)
      onClose()
    },
    onError: (error) => toast.error(errorText(error)),
  })

  return (
    <Modal scrollable open onClose={onClose} title={client ? `Edit ${client.code}` : 'Add client'} size="lg">
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <FormField label="Title" htmlFor="cl-title">
          <Select id="cl-title" value={form.title} onChange={set('title')}>
            <option value="">—</option>
            {['Mr.', 'Mrs.', 'Ms.', 'Dr.'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Full name" htmlFor="cl-name" required>
          <Input id="cl-name" value={form.fullName} onChange={set('fullName')} required />
        </FormField>
        <FormField label="Mobile" htmlFor="cl-mobile" required hint="10 digits. One client per mobile.">
          <Input id="cl-mobile" inputMode="numeric" maxLength={10} value={form.mobile} onChange={set('mobile')} required />
        </FormField>
        <FormField label="Email" htmlFor="cl-email">
          <Input id="cl-email" type="email" value={form.email} onChange={set('email')} />
        </FormField>
        <FormField label="Father / husband name" htmlFor="cl-guardian">
          <Input id="cl-guardian" value={form.guardianName} onChange={set('guardianName')} />
        </FormField>
        <FormField label="Gender" htmlFor="cl-gender">
          <Select id="cl-gender" value={form.gender} onChange={set('gender')}>
            <option value="">—</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </Select>
        </FormField>
        <FormField label="Date of birth" htmlFor="cl-dob">
          <Input id="cl-dob" type="date" value={form.dob} onChange={set('dob')} />
        </FormField>
        <FormField label="Status" htmlFor="cl-status">
          <Select id="cl-status" value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </FormField>
        <FormField label="Address" htmlFor="cl-address" className="sm:col-span-2">
          <Textarea id="cl-address" rows={2} value={form.address} onChange={set('address')} />
        </FormField>
        <FormField label="City" htmlFor="cl-city">
          <Input id="cl-city" value={form.city} onChange={set('city')} />
        </FormField>
        <FormField label="State" htmlFor="cl-state">
          <Input id="cl-state" value={form.state} onChange={set('state')} />
        </FormField>
        <FormField label="Pin code" htmlFor="cl-pin">
          <Input id="cl-pin" inputMode="numeric" value={form.pinCode} onChange={set('pinCode')} />
        </FormField>
        <FormField label="ID proof type" htmlFor="cl-idtype">
          <Input id="cl-idtype" placeholder="Aadhaar, PAN …" value={form.idProof.type} onChange={setProof('type')} />
        </FormField>
        <FormField label="ID proof number" htmlFor="cl-idno">
          <Input id="cl-idno" value={form.idProof.number} onChange={setProof('number')} />
        </FormField>
        <FormField label="ID proof file (link)" htmlFor="cl-idfile">
          <Input id="cl-idfile" type="url" placeholder="https://…" value={form.idProof.file} onChange={setProof('file')} />
        </FormField>
        <FormField label="Notes" htmlFor="cl-notes" className="sm:col-span-2">
          <Textarea id="cl-notes" rows={2} value={form.notes} onChange={set('notes')} />
        </FormField>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={save.isPending}>
            {client ? 'Save client' : 'Add client'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
