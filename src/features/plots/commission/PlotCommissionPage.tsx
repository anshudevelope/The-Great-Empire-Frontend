import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchPlotLedger, fetchPlotSummary, type CommissionType } from '@/api/plots'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { DataTable, PageHeader, Pager, Stat, TabStrip, Td, Th } from '../PlotUi'
import { day, inr, pct, rowClass } from '../format'
import { usePlotConfig } from '../hooks'

type Tab = 'summary' | 'ledger'

/**
 * Plot Commission: per associate, the separate plot carry and leg volume next
 * to what they've earned; and the ledger row by row. Entirely separate from
 * registration commission.
 */
export function PlotCommissionPage() {
  const config = usePlotConfig()
  const [tab, setTab] = useState<Tab>('summary')

  return (
    <div>
      <PageHeader
        title="Plot commission"
        description={
          config.data
            ? `${pct(config.data.commission.direct)} direct to the associate a sale is credited to, ${pct(config.data.commission.matching)} matching on the plot carry — earned on every payment received, separate from registration.`
            : 'Commission earned on plot payments.'
        }
        actions={
          <Link to="/admin/plot-commission/payouts">
            <Button variant="secondary">Plot payouts</Button>
          </Link>
        }
      />
      <TabStrip<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'summary', label: 'By associate' },
          { value: 'ledger', label: 'Ledger' },
        ]}
      />
      {tab === 'summary' ? <SummaryTab /> : <LedgerTab />}
    </div>
  )
}

function SummaryTab() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ['plot-commission', 'summary', search, page],
    queryFn: () => fetchPlotSummary({ search: search || undefined, page: String(page) }),
  })
  const rows = data?.data ?? []

  return (
    <>
      <div className="mb-4">
        <Input
          placeholder="Search associate ID"
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
        <EmptyState title="No plot business yet" description="Associates appear here once a payment is received on a plot credited to them or their downline." />
      ) : (
        <>
          <DataTable
            minWidth={980}
            head={
              <tr>
                <Th>Associate</Th>
                <Th right>Plot volume L / R</Th>
                <Th right>Carry L / R</Th>
                <Th right>Direct earned</Th>
                <Th right>Matching earned</Th>
                <Th right>Unpaid</Th>
                <Th right>Paid out</Th>
              </tr>
            }
          >
            {rows.map((r) => (
              <tr key={r.associate} className={rowClass}>
                <Td>
                  <Link
                    to={`/admin/plot-commission/tree/${r.associate}`}
                    className="font-mono text-xs text-info hover:underline"
                    title="View plot tree"
                  >
                    {r.memberCode}
                  </Link>
                  <span className="block text-xs text-text-subtle">{r.fullName}</span>
                </Td>
                <Td right className="text-text-muted">
                  {inr(r.volume.left)} / {inr(r.volume.right)}
                </Td>
                <Td right className="text-text-muted">
                  {inr(r.carry.left)} / {inr(r.carry.right)}
                </Td>
                <Td right>{inr(r.earned.direct)}</Td>
                <Td right>{inr(r.earned.matching)}</Td>
                <Td right className="font-semibold text-info">
                  {inr(r.unpaid)}
                </Td>
                <Td right className="text-text-muted">
                  {inr(r.paid)}
                </Td>
              </tr>
            ))}
          </DataTable>
          {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
        </>
      )}
    </>
  )
}

const TYPE_TONE: Record<CommissionType, 'success' | 'info' | 'danger'> = { direct: 'success', matching: 'info', reversal: 'danger' }

function LedgerTab() {
  const [type, setType] = useState<'' | CommissionType>('')
  const [paid, setPaid] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const filters = { type: type || undefined, paid: paid || undefined, search: search || undefined, page: String(page) }
  const { data, isLoading } = useQuery({ queryKey: ['plot-commission', 'ledger', filters], queryFn: () => fetchPlotLedger(filters) })
  const rows = data?.data ?? []

  return (
    <>
      {data && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <Stat label="Total (filtered)" value={inr(data.summary.total)} />
          <Stat label="Unpaid (filtered)" value={inr(data.summary.unpaid)} tone="accent" />
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Search associate ID or booking no"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="w-full sm:w-72"
        />
        <Select value={type} onChange={(e) => setType(e.target.value as '' | CommissionType)} containerClassName="w-full sm:w-40" aria-label="Type">
          <option value="">All types</option>
          <option value="direct">Direct</option>
          <option value="matching">Matching</option>
          <option value="reversal">Reversal</option>
        </Select>
        <Select value={paid} onChange={(e) => setPaid(e.target.value)} containerClassName="w-full sm:w-40" aria-label="Paid">
          <option value="">Paid & unpaid</option>
          <option value="false">Unpaid</option>
          <option value="true">Paid out</option>
        </Select>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No commission rows" description="Rows are written whenever a plot payment is received." />
      ) : (
        <>
          <DataTable
            minWidth={980}
            head={
              <tr>
                <Th>Date</Th>
                <Th>Beneficiary</Th>
                <Th>Type</Th>
                <Th>From booking</Th>
                <Th right>Base</Th>
                <Th right>Rate</Th>
                <Th right>Amount</Th>
                <Th>Payout</Th>
              </tr>
            }
          >
            {rows.map((r) => (
              <tr key={r._id} className={rowClass}>
                <Td className="text-text-muted">{day(r.createdAt)}</Td>
                <Td className="font-mono text-xs text-text">{r.beneficiaryCode}</Td>
                <Td>
                  <Badge tone={TYPE_TONE[r.type]}>{r.type}</Badge>
                  {r.basis.legSide && <span className="ml-1 text-xs text-text-subtle">{r.basis.legSide} leg</span>}
                </Td>
                <Td>
                  <Link to={`/admin/plot-sales/bookings/${r.booking}`} className="font-mono text-xs text-info hover:underline">
                    {r.bookingCode}
                  </Link>
                  <span className="block text-xs text-text-subtle">sold by {r.sourceAssociateCode}</span>
                </Td>
                <Td right className="text-text-muted">
                  {inr(r.basis.base)}
                </Td>
                <Td right className="text-text-muted">
                  {pct(r.basis.rate)}
                </Td>
                <Td right className={r.amount < 0 ? 'font-medium text-danger' : 'font-medium text-text'}>
                  {inr(r.amount)}
                </Td>
                <Td className="text-xs text-text-muted">{r.payout ? r.payout.payoutNo : 'Unpaid'}</Td>
              </tr>
            ))}
          </DataTable>
          {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
        </>
      )}
    </>
  )
}
