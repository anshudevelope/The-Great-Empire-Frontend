import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createCompany, deleteCompany, fetchCompanies, updateCompany, type Company, type CompanyInput } from '@/api/plots'
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
import { rowClass } from '../format'

const errorText = (error: unknown) => (error instanceof ApiRequestError ? error.message : 'Something went wrong.')

const blank: CompanyInput = {
  name: '',
  address: '',
  contactNumber: '',
  country: 'India',
  state: 'Uttar Pradesh',
  city: '',
  pinCode: '',
  logo: '',
  status: 'active',
}

/** Property Management → Companies: the legal entities projects are sold under. */
export function CompaniesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Company | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Company | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['plot-companies', search, page],
    queryFn: () => fetchCompanies({ search: search || undefined, page: String(page) }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => {
      toast.success('Company deleted')
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: ['plot-companies'] })
    },
    onError: (error) => toast.error(errorText(error)),
  })

  const rows = data?.data ?? []

  return (
    <div>
      <PageHeader
        title="Companies"
        description="The companies your projects are sold under."
        actions={
          <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setEditing('new')}>
            Add company
          </Button>
        }
      />

      <div className="mb-4">
        <Input
          placeholder="Search code, name or contact number"
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
        <EmptyState title="No companies yet" description="Add the company your projects are sold under." />
      ) : (
        <>
          <DataTable
            head={
              <tr>
                <Th>Code</Th>
                <Th>Company</Th>
                <Th>Address</Th>
                <Th>Contact</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            }
          >
            {rows.map((c) => (
              <tr key={c._id} className={rowClass}>
                <Td className="font-mono text-xs text-text-muted">{c.code}</Td>
                <Td>
                  <div className="flex items-center gap-3">
                    {c.logo?.url ? (
                      <img src={c.logo.url} alt="" className="h-8 w-8 rounded-control border border-border object-contain" />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-control bg-info-bg text-xs font-semibold text-info">
                        {c.name.slice(0, 1)}
                      </span>
                    )}
                    <span className="font-medium text-text">{c.name}</span>
                  </div>
                </Td>
                <Td className="text-text-muted">
                  {c.address}
                  <span className="block text-xs text-text-subtle">
                    {[c.city, c.state, c.pinCode].filter(Boolean).join(', ')}
                  </span>
                </Td>
                <Td className="text-text-muted">{c.contactNumber}</Td>
                <Td>
                  <Badge tone={c.status === 'active' ? 'success' : 'neutral'}>{c.status}</Badge>
                </Td>
                <Td right>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(c)}>
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

      {editing && <CompanyModal company={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}

      <ConfirmModal
        open={!!deleting}
        title={`Delete ${deleting?.name ?? 'company'}?`}
        description="Only a company with no projects can be deleted. Mark it inactive instead if it has history."
        confirmLabel="Delete"
        tone="danger"
        isLoading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting._id)}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}

function CompanyModal({ company, onClose }: { company: Company | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CompanyInput>(() =>
    company ? { ...blank, ...company, logo: company.logo?.url ?? '' } : blank,
  )
  const set = (key: keyof CompanyInput) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const save = useMutation({
    mutationFn: () => (company ? updateCompany(company._id, form) : createCompany(form)),
    onSuccess: () => {
      toast.success(company ? 'Company updated' : 'Company added')
      void queryClient.invalidateQueries({ queryKey: ['plot-companies'] })
      onClose()
    },
    onError: (error) => toast.error(errorText(error)),
  })

  return (
    <Modal scrollable open onClose={onClose} title={company ? `Edit ${company.code}` : 'Add company'} size="lg">
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <FormField label="Company name" htmlFor="co-name" required className="sm:col-span-2">
          <Input id="co-name" value={form.name} onChange={set('name')} required />
        </FormField>
        <FormField label="Address" htmlFor="co-address" required className="sm:col-span-2">
          <Textarea id="co-address" rows={2} value={form.address} onChange={set('address')} required />
        </FormField>
        <FormField label="Contact number" htmlFor="co-contact" required>
          <Input id="co-contact" inputMode="tel" value={form.contactNumber} onChange={set('contactNumber')} required />
        </FormField>
        <FormField label="Country" htmlFor="co-country">
          <Input id="co-country" value={form.country} onChange={set('country')} />
        </FormField>
        <FormField label="State" htmlFor="co-state" required>
          <Input id="co-state" value={form.state} onChange={set('state')} required />
        </FormField>
        <FormField label="City" htmlFor="co-city" required>
          <Input id="co-city" value={form.city} onChange={set('city')} required />
        </FormField>
        <FormField label="Pin code" htmlFor="co-pin" required>
          <Input id="co-pin" inputMode="numeric" value={form.pinCode} onChange={set('pinCode')} required />
        </FormField>
        <FormField label="Status" htmlFor="co-status">
          <Select id="co-status" value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </FormField>
        <FormField label="Logo URL" htmlFor="co-logo" hint="Paste an image link. Uploads come later." className="sm:col-span-2">
          <Input id="co-logo" type="url" value={form.logo} onChange={set('logo')} placeholder="https://…" />
        </FormField>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={save.isPending}>
            {company ? 'Save changes' : 'Add company'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
