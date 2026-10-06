import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchDues } from '@/api/plots'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { DataTable, PageHeader, Pager, Stat, Td, Th } from '../PlotUi'
import { KIND_LABEL, day, inr, rowClass, todayIso } from '../format'
import { useProjectOptions } from '../hooks'

/** Plot Sales → Dues: instalments due up to a date, overdue first to chase. */
export function DuesPage() {
  const projects = useProjectOptions()
  const [asOf, setAsOf] = useState(todayIso())
  const [project, setProject] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [page, setPage] = useState(1)

  const filters = {
    asOf,
    project: project || undefined,
    overdue: overdueOnly ? 'true' : undefined,
    page: String(page),
  }
  const { data, isLoading } = useQuery({ queryKey: ['plot-dues', filters], queryFn: () => fetchDues(filters) })
  const rows = data?.data ?? []

  return (
    <div>
      <PageHeader title="Dues" description="Instalments due on or before a date, oldest first. Overdue ones are flagged." />

      {data && (
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <Stat label="Due by this date" value={inr(data.summary.due)} tone="accent" />
          <Stat label="Already overdue" value={inr(data.summary.overdue)} tone={data.summary.overdue > 0 ? 'warn' : undefined} />
          <Stat label="Overdue instalments" value={String(data.summary.overdueCount)} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <FormField label="Due on or before" htmlFor="du-date">
          <Input
            id="du-date"
            type="date"
            value={asOf}
            onChange={(e) => {
              setAsOf(e.target.value)
              setPage(1)
            }}
            className="w-44"
          />
        </FormField>
        <FormField label="Project" htmlFor="du-project">
          <Select id="du-project" value={project} onChange={(e) => setProject(e.target.value)} containerClassName="w-56">
            <option value="">All projects</option>
            {projects.data?.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </Select>
        </FormField>
        <label className="flex h-10 items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => {
              setOverdueOnly(e.target.checked)
              setPage(1)
            }}
            className="h-4 w-4 accent-[var(--color-info)]"
          />
          Overdue only
        </label>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing due" description="No unpaid instalments fall on or before this date." />
      ) : (
        <>
          <DataTable
            minWidth={900}
            head={
              <tr>
                <Th>Due</Th>
                <Th>Booking</Th>
                <Th>Client</Th>
                <Th>Instalment</Th>
                <Th>Credited to</Th>
                <Th right>Amount</Th>
                <Th />
              </tr>
            }
          >
            {rows.map((p) => (
              <tr key={p._id} className={rowClass}>
                <Td>
                  <span className="text-text">{day(p.dueDate)}</span>
                  <span className="mt-1 block">{p.overdue ? <Badge tone="danger">overdue</Badge> : <Badge tone="warning">due</Badge>}</span>
                </Td>
                <Td>
                  <span className="font-mono text-xs text-text">{p.booking?.code}</span>
                  <span className="block text-xs text-text-subtle">
                    {p.plot?.name} · {p.project?.name}
                  </span>
                </Td>
                <Td>
                  <span className="text-text">{p.client?.fullName}</span>
                  <a href={`tel:${p.client?.mobile}`} className="block text-xs text-info hover:underline">
                    {p.client?.mobile}
                  </a>
                </Td>
                <Td className="text-text-muted">{p.kind === 'emi' ? `EMI ${p.seq}` : KIND_LABEL[p.kind]}</Td>
                <Td className="font-mono text-xs text-text-muted">{p.associate?.memberCode}</Td>
                <Td right className="font-medium text-text">
                  {inr(p.dueAmount)}
                </Td>
                <Td right>
                  <Link to={`/admin/plot-sales/bookings/${p.booking?._id}`}>
                    <Button size="sm" variant="ghost">
                      Open
                    </Button>
                  </Link>
                </Td>
              </tr>
            ))}
          </DataTable>
          {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
        </>
      )}
    </div>
  )
}
