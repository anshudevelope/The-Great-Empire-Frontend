import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchBookings, type BookingStatus } from '@/api/plots'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { PlusIcon } from '@/components/icons/icons'
import { DataTable, PageHeader, Pager, Td, Th } from '../PlotUi'
import { BOOKING_STATUS_TONE, PLAN_LABEL, day, inr, rowClass } from '../format'
import { useProjectOptions } from '../hooks'

/** Plot Sales → Bookings: every sale, its plan and how much is paid. */
export function BookingsPage() {
  const [params, setParams] = useSearchParams()
  const client = params.get('client') ?? ''
  const [status, setStatus] = useState<'' | BookingStatus>('')
  const [project, setProject] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const projects = useProjectOptions()

  const filters = {
    status: status || undefined,
    project: project || undefined,
    client: client || undefined,
    search: search || undefined,
    page: String(page),
  }
  const { data, isLoading } = useQuery({ queryKey: ['plot-bookings', filters], queryFn: () => fetchBookings(filters) })
  const rows = data?.data ?? []

  return (
    <div>
      <PageHeader
        title="Bookings"
        description="Every plot sold — the client, the associate it's credited to, the plan and what's been paid."
        actions={
          <Link to="/admin/plot-sales/sell">
            <Button leftIcon={<PlusIcon className="h-4 w-4" />}>Sell plot</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Search booking no or associate ID"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="w-full sm:w-72"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value as '' | BookingStatus)} containerClassName="w-full sm:w-44" aria-label="Status">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Select value={project} onChange={(e) => setProject(e.target.value)} containerClassName="w-full sm:w-56" aria-label="Project">
          <option value="">All projects</option>
          {projects.data?.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
        {client && (
          <Button variant="ghost" onClick={() => setParams({})}>
            Clear client filter
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No bookings yet" description="Sell a plot to create the first booking." />
      ) : (
        <>
          <DataTable
            minWidth={1000}
            head={
              <tr>
                <Th>Booking</Th>
                <Th>Plot</Th>
                <Th>Client</Th>
                <Th>Credited to</Th>
                <Th>Plan</Th>
                <Th right>Price</Th>
                <Th right>Paid</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            }
          >
            {rows.map((b) => {
              const plot = b.plot as { name: string; code: string }
              const paidPct = b.price > 0 ? Math.min(100, Math.round((b.paidTotal / b.price) * 100)) : 0
              return (
                <tr key={b._id} className={rowClass}>
                  <Td>
                    <Link to={`/admin/plot-sales/bookings/${b._id}`} className="font-mono text-xs font-medium text-info hover:underline">
                      {b.code}
                    </Link>
                    <span className="block text-xs text-text-subtle">{day(b.bookedOn)}</span>
                  </Td>
                  <Td>
                    <span className="font-medium text-text">{plot?.name}</span>
                    <span className="block text-xs text-text-subtle">{b.project?.name}</span>
                  </Td>
                  <Td>
                    <span className="text-text">{b.client?.fullName}</span>
                    <span className="block text-xs text-text-subtle">{b.client?.mobile}</span>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs text-text">{b.associate?.memberCode}</span>
                    <span className="block text-xs text-text-subtle">{b.associate?.fullName}</span>
                  </Td>
                  <Td className="text-text-muted">
                    {PLAN_LABEL[b.plan]}
                    {b.plan === 'emi' && <span className="block text-xs text-text-subtle">{b.tenureMonths} months</span>}
                  </Td>
                  <Td right className="font-medium text-text">
                    {inr(b.price)}
                  </Td>
                  <Td right>
                    <span className="text-text">{inr(b.paidTotal)}</span>
                    <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-pill bg-neutral-hover">
                      <span className="block h-full bg-success" style={{ width: `${paidPct}%` }} />
                    </span>
                  </Td>
                  <Td>
                    <Badge tone={BOOKING_STATUS_TONE[b.status]}>{b.status}</Badge>
                  </Td>
                  <Td right>
                    <Link to={`/admin/plot-sales/bookings/${b._id}`}>
                      <Button size="sm" variant="ghost">
                        Open
                      </Button>
                    </Link>
                  </Td>
                </tr>
              )
            })}
          </DataTable>
          {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
        </>
      )}
    </div>
  )
}
