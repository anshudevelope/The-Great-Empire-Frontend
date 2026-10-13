import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchEmis, type EmiRow, type EmiView } from '@/api/plots'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { DataTable, PageHeader, Pager, Stat, TabStrip, Td, Th } from '../PlotUi'
import { day, inr, rowClass } from '../format'
import { useProjectOptions } from '../hooks'

const VIEW_LABEL: Record<EmiView, string> = {
  pending: 'Pending',
  overdue: 'Overdue',
  upcoming: 'Upcoming',
  paid: 'Paid',
  all: 'All',
}

const EMPTY_COPY: Record<EmiView, { title: string; description: string }> = {
  pending: { title: 'Nothing pending', description: 'Every EMI due up to today has been paid.' },
  overdue: { title: 'Nothing overdue', description: 'No EMI is past its due date.' },
  upcoming: { title: 'Nothing upcoming', description: 'No unpaid EMI falls due after today for these filters.' },
  paid: { title: 'No paid EMIs', description: 'No EMI has been settled for these filters yet.' },
  all: { title: 'No EMIs found', description: 'No EMI matches these filters.' },
}

const WITHIN_OPTIONS = [
  { value: '', label: 'Any time ahead' },
  { value: '7', label: 'Next 7 days' },
  { value: '30', label: 'Next 30 days' },
  { value: '90', label: 'Next 90 days' },
]

const MS_PER_DAY = 86_400_000
const startOfToday = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Whole days from today to the due date: negative once overdue. */
const daysFromToday = (dueDate: string) => {
  const due = new Date(dueDate)
  return Math.round((new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() - startOfToday()) / MS_PER_DAY)
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function EmiStatus({ row }: { row: EmiRow }) {
  if (row.status === 'paid') return <Badge tone="success">{`paid · ${day(row.lastPaidOn)}`}</Badge>
  const days = daysFromToday(row.dueDate)
  const part = row.status === 'partial' ? 'part-paid · ' : ''
  if (days < 0) return <Badge tone="danger">{`${part}${plural(-days, 'day')} overdue`}</Badge>
  if (days === 0) return <Badge tone="warning">{`${part}due today`}</Badge>
  return <Badge tone="info">{`${part}in ${plural(days, 'day')}`}</Badge>
}

/** Plot Sales → EMIs: every EMI by where it stands today. Pending is the working view. */
export function EmisPage() {
  const navigate = useNavigate()
  const projects = useProjectOptions()
  const [view, setView] = useState<EmiView>('pending')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [project, setProject] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [within, setWithin] = useState('')
  const [page, setPage] = useState(1)

  // The list refetches per keystroke otherwise; wait for a pause in typing.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const filters = {
    view,
    search: debouncedSearch || undefined,
    project: project || undefined,
    from: from || undefined,
    to: to || undefined,
    within: view === 'upcoming' && within ? within : undefined,
    page: String(page),
  }
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['plot-emis', filters],
    queryFn: () => fetchEmis(filters),
    placeholderData: keepPreviousData,
  })
  const rows = data?.data ?? []
  const counts = data?.summary.counts
  const amounts = data?.summary.amounts

  /** Any filter change goes back to page one. */
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(1)
  }
  const filtered = !!(debouncedSearch || project || from || to || (view === 'upcoming' && within))
  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setProject('')
    setFrom('')
    setTo('')
    setWithin('')
    setPage(1)
  }

  const tabs = (Object.keys(VIEW_LABEL) as EmiView[]).map((value) => ({
    value,
    label: VIEW_LABEL[value],
    count: counts?.[value],
  }))

  return (
    <div>
      <PageHeader
        title="EMIs"
        description="Every EMI by where it stands today. Pending is what to collect now; open a row to see the booking and take the payment."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pending to collect" value={amounts ? inr(amounts.pending) : '—'} tone="accent" />
        <Stat label="Of which overdue" value={amounts ? inr(amounts.overdue) : '—'} tone={amounts && amounts.overdue > 0 ? 'warn' : undefined} />
        <Stat label="Upcoming" value={amounts ? inr(amounts.upcoming) : '—'} />
        <Stat label="Collected" value={amounts ? inr(amounts.paid) : '—'} tone="good" />
      </div>

      <TabStrip tabs={tabs} value={view} onChange={reset(setView)} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <FormField label="Search" htmlFor="emi-search">
          <Input
            id="emi-search"
            placeholder="Booking no, client name or mobile"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72"
          />
        </FormField>
        <FormField label="Project" htmlFor="emi-project">
          <Select id="emi-project" value={project} onChange={(e) => reset(setProject)(e.target.value)} containerClassName="w-full sm:w-52">
            <option value="">All projects</option>
            {projects.data?.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Due from" htmlFor="emi-from">
          <Input id="emi-from" type="date" value={from} max={to || undefined} onChange={(e) => reset(setFrom)(e.target.value)} className="w-40" />
        </FormField>
        <FormField label="Due to" htmlFor="emi-to">
          <Input id="emi-to" type="date" value={to} min={from || undefined} onChange={(e) => reset(setTo)(e.target.value)} className="w-40" />
        </FormField>
        {view === 'upcoming' && (
          <FormField label="Window" htmlFor="emi-within">
            <Select id="emi-within" value={within} onChange={(e) => reset(setWithin)(e.target.value)} containerClassName="w-44">
              {WITHIN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        {filtered && (
          <Button variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn’t load EMIs"
          description="Something went wrong fetching the list."
          action={<Button onClick={() => void refetch()}>Try again</Button>}
        />
      ) : rows.length === 0 ? (
        <EmptyState {...EMPTY_COPY[view]} />
      ) : (
        <>
          <DataTable
            minWidth={900}
            head={
              <tr>
                <Th>Due</Th>
                <Th>Booking</Th>
                <Th>Client</Th>
                <Th>EMI</Th>
                <Th>Credited to</Th>
                <Th right>{view === 'paid' ? 'Paid' : 'Amount'}</Th>
                <Th />
              </tr>
            }
          >
            {rows.map((p) => (
              <tr
                key={p._id}
                className={`${rowClass} cursor-pointer`}
                onClick={() => navigate(`/admin/plot-sales/bookings/${p.booking._id}`)}
              >
                <Td>
                  <span className="text-text">{day(p.dueDate)}</span>
                  <span className="mt-1 block">
                    <EmiStatus row={p} />
                  </span>
                </Td>
                <Td>
                  <span className="font-mono text-xs text-text">{p.booking.code}</span>
                  <span className="block text-xs text-text-subtle">
                    {p.plot?.name} · {p.project?.name}
                  </span>
                </Td>
                <Td>
                  <span className="text-text">{p.client?.fullName}</span>
                  <a
                    href={`tel:${p.client?.mobile}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block text-xs text-info hover:underline"
                  >
                    {p.client?.mobile}
                  </a>
                </Td>
                <Td className="text-text-muted">
                  EMI {p.seq}
                  {!!p.booking.tenureMonths && <span className="block text-xs text-text-subtle">of {p.booking.tenureMonths}</span>}
                </Td>
                <Td className="font-mono text-xs text-text-muted">{p.associate?.memberCode}</Td>
                <Td right className="font-medium text-text">
                  {p.status === 'paid' ? inr(p.paidAmount) : inr(p.remaining)}
                  {p.status === 'partial' && <span className="block text-xs text-text-subtle">of {inr(p.dueAmount)}</span>}
                </Td>
                <Td right>
                  <Link to={`/admin/plot-sales/bookings/${p.booking._id}`} onClick={(e) => e.stopPropagation()}>
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
