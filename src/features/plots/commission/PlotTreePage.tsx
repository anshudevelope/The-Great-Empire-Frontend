import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  fetchPlotTree,
  type BookingStatus,
  type PlotNodeSummary,
  type PlotTreeLeg,
  type PlotTreeMember,
  type PlotTreeSale,
} from '@/api/plots'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { PlotIcon, UserCircleIcon } from '@/components/icons/icons'
import { cn } from '@/lib/cn'
import { PageHeader } from '../PlotUi'
import { PLAN_LABEL, day, inr } from '../format'

const EDGE = 8 // minimum gap between a hover card and the viewport edge
const GAP = 8 // gap between a hover card and its node
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(n, max))

const SALE_RING: Record<BookingStatus, string> = {
  active: 'ring-blue-500',
  completed: 'ring-success',
  cancelled: 'ring-text-subtle',
}
const SALE_DOT: Record<BookingStatus, string> = {
  active: 'bg-info',
  completed: 'bg-success',
  cancelled: 'bg-text-subtle',
}

/**
 * One associate's plot tree, drawn like the associate tree: the associate on
 * top, their own Left and Right legs below, and under each leg a node per live
 * plot sale counted in it — their own sales placed there, and sales by anyone
 * in the downline under it. Nodes stay small; details show on hover.
 */
export function PlotTreePage() {
  const { id = '' } = useParams<{ id: string }>()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['plot-commission', 'tree', id],
    queryFn: () => fetchPlotTree(id),
    enabled: !!id,
  })
  const tree = data?.data

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }
  if (isError || !tree) {
    return <EmptyState title="Plot tree not available" description="This associate could not be loaded." />
  }

  const { associate, summary } = tree
  return (
    <div>
      <PageHeader
        title="Plot tree"
        back={`/admin/associates/tree/${associate._id}`}
        description={`${associate.fullName} (${associate.memberCode}) — plot sales in their own left and right legs. Hover a node for details.`}
        actions={
          <Link to={`/admin/associates/tree/${associate._id}`}>
            <Button variant="secondary">Associate tree</Button>
          </Link>
        }
      />

      <div className="scrollbar-thin min-h-[420px] overflow-auto rounded-card bg-surface px-10 py-10 shadow-card">
        <div className="flex w-fit min-w-full justify-center">
          <ul className="org-tree">
            <li>
              <MemberNode member={associate} summary={summary} />
              <ul>
                <LegBranch side="Left" group="A" leg={tree.left} summary={summary} />
                <LegBranch side="Right" group="B" leg={tree.right} summary={summary} />
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function MemberNode({ member, summary }: { member: PlotTreeMember; summary: PlotNodeSummary }) {
  return (
    <Hover
      card={
        <HoverCard title={member.fullName} code={member.memberCode}>
          <Rows
            rows={[
              ['Plot direct', inr(summary.earned.direct)],
              ['Plot matching', inr(summary.earned.matching)],
              ['Plot earning', inr(summary.earned.direct + summary.earned.matching), 'good'],
              ['Unpaid', inr(summary.unpaid)],
              ['Paid out', inr(summary.paid)],
            ]}
          />
        </HoverCard>
      }
    >
      <NodeShell label={member.fullName} sub={member.memberCode} strong>
        <Circle ring="ring-blue-500">
          {member.profileImage?.url ? (
            <img src={member.profileImage.url} alt={member.fullName} className="h-full w-full rounded-full object-cover" />
          ) : (
            <UserCircleIcon className="h-6 w-6 text-blue-400" />
          )}
        </Circle>
      </NodeShell>
    </Hover>
  )
}

function LegBranch({
  side,
  group,
  leg,
  summary,
}: {
  side: 'Left' | 'Right'
  group: string
  leg: PlotTreeLeg
  summary: PlotNodeSummary
}) {
  const key = side === 'Left' ? 'left' : 'right'
  const sales = summary.sales[key]
  return (
    <li>
      <Hover
        card={
          <HoverCard title={`${side} leg`} code={`Group ${group}`}>
            <Rows
              rows={[
                ['Sales', String(sales)],
                ['Bus. Amt', inr(summary.volume[key])],
                ['Act. Amt', inr(summary.ratedVolume[key])],
                ['Carry', inr(summary.carry[key]), summary.carry[key] > 0 ? 'accent' : undefined],
                ['Headed by', leg.head ? `${leg.head.fullName} (${leg.head.memberCode})` : '—'],
              ]}
            />
          </HoverCard>
        }
      >
        <NodeShell label={`${side} leg`} sub={`${sales} sale${sales === 1 ? '' : 's'}`}>
          <Circle ring="ring-border-strong">
            <span className="text-base font-bold text-blue-600">{side === 'Left' ? 'L' : 'R'}</span>
          </Circle>
        </NodeShell>
      </Hover>
      <ul>
        {leg.bookings.length === 0 ? (
          <li>
            <EmptySlot />
          </li>
        ) : (
          leg.bookings.map((sale) => (
            <li key={sale._id}>
              <SaleNode sale={sale} />
            </li>
          ))
        )}
      </ul>
    </li>
  )
}

function SaleNode({ sale }: { sale: PlotTreeSale }) {
  const navigate = useNavigate()
  const paidPct = sale.price > 0 ? Math.min(100, (sale.paidTotal / sale.price) * 100) : 0
  return (
    <Hover
      card={
        <HoverCard title={sale.plot?.name ?? 'Plot'} code={sale.code} status={sale.status}>
          <Rows
            rows={[
              ['Project', sale.project?.name ?? '—'],
              ['Plot no', sale.plot?.code ?? '—'],
              ['Client', sale.client?.fullName ?? '—'],
              ['Sold by', sale.own ? `${sale.seller.memberCode} (own sale)` : `${sale.seller.fullName} (${sale.seller.memberCode})`],
              ['Plan', PLAN_LABEL[sale.plan]],
              ['Booked on', day(sale.bookedOn)],
              ['Price', inr(sale.price)],
              ['Paid', `${inr(sale.paidTotal)} (${Math.round(paidPct)}%)`, 'good'],
            ]}
          />
          <div className="px-3 pb-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-neutral-hover">
              <div className="h-full rounded-full bg-success" style={{ width: `${paidPct}%` }} />
            </div>
          </div>
        </HoverCard>
      }
    >
      <button
        type="button"
        onClick={() => navigate(`/admin/plot-sales/bookings/${sale._id}`)}
        title="Click to open the booking"
        className="cursor-pointer rounded-control transition-all hover:-translate-y-0.5"
      >
        <NodeShell label={sale.plot?.name ?? 'Plot'} sub={sale.code} note={sale.own ? 'Own sale' : `via ${sale.seller.memberCode}`}>
          <Circle ring={SALE_RING[sale.status]} dot={SALE_DOT[sale.status]}>
            <PlotIcon className="h-5 w-5 text-blue-500" />
          </Circle>
        </NodeShell>
      </button>
    </Hover>
  )
}

function EmptySlot() {
  return (
    <div className="flex w-28 shrink-0 flex-col items-center gap-1.5 px-2 py-2 text-center opacity-70">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-border-strong bg-surface">
        <PlotIcon className="h-5 w-5 text-text-subtle" />
      </span>
      <span className="text-xs font-medium text-text-subtle">No sales</span>
    </div>
  )
}

// --- Node pieces --------------------------------------------------------------

function NodeShell({
  label,
  sub,
  note,
  strong,
  children,
}: {
  label: string
  sub: string
  note?: string
  strong?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex w-28 shrink-0 flex-col items-center gap-1.5 px-2 py-2 text-center">
      {children}
      <span className={cn('line-clamp-2 text-xs leading-tight text-text group-hover:text-info', strong ? 'font-semibold' : 'font-medium')}>
        {label}
      </span>
      <span className="font-mono text-[10px] leading-none text-text-subtle">{sub}</span>
      {note && <span className="text-[10px] leading-none text-text-muted">{note}</span>}
    </div>
  )
}

function Circle({ ring, dot, children }: { ring: string; dot?: string; children: ReactNode }) {
  return (
    <span className={cn('relative flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-card ring-2', ring)}>
      {children}
      {dot && <span className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white', dot)} />}
    </span>
  )
}

// --- Hover card ---------------------------------------------------------------

/** Wraps a node; shows `card` beside it while hovered. */
function Hover({ card, children }: { card: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  return (
    <div
      ref={ref}
      className="group relative"
      onMouseEnter={() => setAnchor(ref.current?.getBoundingClientRect() ?? null)}
      onMouseLeave={() => setAnchor(null)}
    >
      {children}
      {anchor && <Floating anchor={anchor}>{card}</Floating>}
    </div>
  )
}

/**
 * Fixed-position portal, placed like the associate tree's card: above the node,
 * else below, else beside it — never over the node itself.
 */
function Floating({ anchor, children }: { anchor: DOMRect; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (el) setSize({ w: el.offsetWidth, h: el.offsetHeight })
  }, [])

  let top = 0
  let left = 0
  if (size) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    left = clamp(anchor.left + anchor.width / 2 - size.w / 2, EDGE, vw - size.w - EDGE)
    const above = anchor.top - GAP - size.h
    const below = anchor.bottom + GAP
    const right = anchor.right + GAP
    const leftSide = anchor.left - GAP - size.w
    const besideTop = clamp(anchor.top + anchor.height / 2 - size.h / 2, EDGE, vh - size.h - EDGE)
    if (above >= EDGE) {
      top = above
    } else if (below + size.h <= vh - EDGE) {
      top = below
    } else if (right + size.w <= vw - EDGE) {
      top = besideTop
      left = right
    } else if (leftSide >= EDGE) {
      top = besideTop
      left = leftSide
    } else {
      top = anchor.top >= vh - anchor.bottom ? above : below
    }
  }

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      style={{ position: 'fixed', top, left, visibility: size ? 'visible' : 'hidden', zIndex: 9999 }}
      className="pointer-events-none w-72 overflow-hidden rounded-card bg-surface text-left shadow-popover"
    >
      {children}
    </div>,
    document.body,
  )
}

function HoverCard({ title, code, status, children }: { title: string; code: string; status?: BookingStatus; children: ReactNode }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2 bg-linear-to-r from-blue-700 to-blue-900 px-3 py-2 text-white">
        <p className="min-w-0 truncate text-[11px] leading-tight">
          <span className="font-semibold">{title}</span> <span className="font-mono opacity-80">({code})</span>
        </p>
        {status && <span className="text-[10px] font-semibold capitalize">{status}</span>}
      </div>
      {children}
    </>
  )
}

type Row = [label: string, value: string, tone?: 'good' | 'accent']

function Rows({ rows }: { rows: Row[] }) {
  return (
    <dl className="divide-y divide-border text-[11px]">
      {rows.map(([label, value, tone]) => (
        <div key={label} className="flex justify-between gap-3 px-3 py-1.5">
          <dt className="text-text-subtle">{label}</dt>
          <dd className={cn('text-right font-medium tabular-nums', tone === 'good' ? 'text-success' : tone === 'accent' ? 'text-info' : 'text-text')}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
