import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { UserCircleIcon } from '@/components/icons/icons'
import { cn } from '@/lib/cn'
import type { AssociateStatus, AssociateTreeNode, LegBusiness } from '@/types/associate'
import { formatDate } from '@/lib/datetime'
import { useQuery } from '@tanstack/react-query'
import { useActiveBusiness } from '@/store/businessStore'
import { useAuthScope } from '@/store/authScope'
import { BUSINESSES } from '@/lib/business'
import { fetchPlotNodeSummary } from '@/api/plots'
import { usePlotConfig } from '@/features/plots/hooks'

const pctLabel = (fraction?: number) => (fraction === undefined ? '' : `${+(fraction * 100).toFixed(2)}%`)

const MIN_TOOLTIP_WIDTH = 288 // w-72; the card grows past this to fit its figures
const EDGE = 8 // minimum gap between the card and the viewport edge
const GAP = 8 // gap between the card and the node it describes

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(n, max))

const EMPTY_LEG: LegBusiness = { count: 0, amount: 0, rated: 0 }

const STATUS_RING: Record<string, string> = {
  approved: 'ring-blue-500',
  pending: 'ring-warning',
  rejected: 'ring-danger',
  suspended: 'ring-text-subtle',
}

const STATUS_DOT: Record<string, string> = {
  approved: 'bg-success',
  pending: 'bg-warning',
  rejected: 'bg-danger',
  suspended: 'bg-text-subtle',
}

interface SelectHandlers {
  selectedId: string | null
  onSelect: (id: string) => void
  /** Re-root the canvas on this member. Double-click a node, or use its ⤢ button. */
  onDrillDown?: (id: string) => void
}

export function TreeRoot({ root, ...handlers }: { root: AssociateTreeNode } & SelectHandlers) {
  return (
    <ul className="org-tree">
      <TreeBranch associateId={root._id} node={root} {...handlers} />
    </ul>
  )
}

function TreeBranch({ node, ...handlers }: { associateId: string; node: AssociateTreeNode } & SelectHandlers) {
  const hasLeft = !!node.leftChild
  const hasRight = !!node.rightChild

  return (
    <li>
      <NodeCard node={node} selected={node._id === handlers.selectedId} {...handlers} />
      {(hasLeft || hasRight) && (
        <ul>
          <ChildSlot childId={node.leftChild} childNode={node.left} {...handlers} />
          <ChildSlot childId={node.rightChild} childNode={node.right} {...handlers} />
        </ul>
      )}
    </li>
  )
}

function ChildSlot({
  childId,
  childNode,
  ...handlers
}: { childId: string | null; childNode: AssociateTreeNode | null } & SelectHandlers) {
  if (!childId) {
    return (
      <li>
        <OpenSlot />
      </li>
    )
  }

  if (!childNode) {
    return (
      <li>
        <MoreSlot />
      </li>
    )
  }

  return <TreeBranch associateId={childId} node={childNode} {...handlers} />
}

const dateOnly = (value?: string) =>
  formatDate(value)

/**
 * Two decimals, grouped Indian-style. Not prefixed with ₹ — the table is dense
 * and every cell is rupees, so the symbol would be four characters of noise per
 * row without telling the reader anything.
 */
const amount = (value: number) =>
  value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type BusinessRow =
  | { label: string; carry: false; left: LegBusiness; right: LegBusiness }
  | { label: string; carry: true; left: number; right: number }

/** The three figures shown under each leg. "Act. Amt" is the rated amount; "Bus. Amt" the full amount paid. */
const LEG_COLUMNS = ['Member', 'Act. Amt', 'Bus. Amt'] as const

/**
 * Hover card, modelled on the reference platform's genealogy tooltip.
 *
 * `business` is optional on the type because a cached or older response may not
 * carry it; falling back to zeros keeps the table's shape stable rather than
 * collapsing rows out of the layout when it is missing.
 */
function NodeTooltip({ node, anchor }: { node: AssociateTreeNode; anchor: DOMRect }) {
  const b = node.business
  // One business, one tier: T1 shows Tier I rows, T2 shows Tier II rows.
  const business = useActiveBusiness()
  const rates = BUSINESSES[business].rates
  const tierII = business === 't2'
  const tier = tierII ? b?.tierII : b?.tierI
  // T2 calls its registration business "ID Referral" (was "Tier II"), next to
  // the Plots rows. T1 keeps "Tier I".
  // const tierLabel = tierII ? 'Tier II' : 'Tier I'
  const tierLabel = tierII ? 'ID Referral' : 'Tier I'
  const rows: BusinessRow[] = [
    {
      label: tierLabel,
      carry: false,
      left: tier?.left ?? EMPTY_LEG,
      right: tier?.right ?? EMPTY_LEG,
    },
    {
      label: `${tierLabel} (Carry)`,
      carry: true,
      left: tier?.carry.left ?? 0,
      right: tier?.carry.right ?? 0,
    },
  ]

  // T2 console only: the plot business, from the plot module's own endpoint
  // (separate pool, separate ledger). The member portal never asks for it.
  const scope = useAuthScope()
  const showPlots = tierII && scope === 'admin'
  const plotQuery = useQuery({
    queryKey: ['plot-commission', 'node', node._id],
    queryFn: () => fetchPlotNodeSummary(node._id),
    enabled: showPlots,
    staleTime: 60_000,
  })
  const plotConfig = usePlotConfig(showPlots)
  const plots = showPlots ? plotQuery.data?.data : undefined
  if (plots) {
    rows.push(
      {
        label: 'Plots',
        carry: false,
        left: { count: plots.sales.left, amount: plots.volume.left, rated: plots.ratedVolume.left },
        right: { count: plots.sales.right, amount: plots.volume.right, rated: plots.ratedVolume.right },
      },
      { label: 'Plots (Carry)', carry: true, left: plots.carry.left, right: plots.carry.right },
    )
  }
  const plotTotal = plots ? plots.earned.direct + plots.earned.matching : 0

  const legCells = (leg: LegBusiness) => [
    String(leg.count),
    amount(leg.rated ?? 0),
    amount(leg.amount),
  ]

  // Which leg the next pairing is waiting on. Only meaningful while one side
  // holds carry and the other does not — once both hold volume the engine has
  // already matched them down to a single-sided remainder.
  const carryL = b?.tierI.carry.left ?? 0
  const carryR = b?.tierI.carry.right ?? 0
  const needs = carryL > 0 && carryR === 0 ? 'R' : carryR > 0 && carryL === 0 ? 'L' : null

  // The card sizes to its content, so its real width and height are only known
  // after it renders. Measure once, then place it — it can't be hovered or
  // scrolled, so anything that lands off-screen is simply lost.
  const cardRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  // Measured again when the plot rows arrive — they make the card taller, and
  // placing it with the old height could push its bottom off-screen.
  const plotsLoaded = !!plots
  useLayoutEffect(() => {
    const el = cardRef.current
    if (el) setSize({ w: el.offsetWidth, h: el.offsetHeight })
  }, [plotsLoaded])

  // Rendered in a portal with fixed positioning. The tree canvas scrolls, so
  // any absolutely-positioned tooltip inside it gets clipped by that overflow —
  // and no z-index can escape an ancestor's clipping box.
  let top = 0
  let left = 0
  if (size) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    left = clamp(anchor.left + anchor.width / 2 - size.w / 2, EDGE, vw - size.w - EDGE)
    // Above the node by default, below it if the top has no room. When neither
    // fits whole (the taller T2 card on a top-row node), go beside the node,
    // and failing that, the roomier of above/below — never over the node itself.
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
      ref={cardRef}
      role="tooltip"
      style={{
        position: 'fixed',
        top,
        left,
        width: 'max-content',
        minWidth: MIN_TOOLTIP_WIDTH,
        maxWidth: `calc(100vw - ${EDGE * 2}px)`,
        visibility: size ? 'visible' : 'hidden',
        zIndex: 9999,
      }}
      className={cn(
        'pointer-events-none overflow-hidden',
        'rounded-card bg-surface text-left shadow-popover',
      )}
    >
      <div className="bg-linear-to-r from-blue-700 to-blue-900 px-3 py-2 text-white">
        <p className="text-[11px] leading-tight">
          <span className="opacity-70">Name : </span>
          <span className="font-semibold">{node.fullName}</span>{' '}
          <span className="font-mono opacity-90">({node.memberCode})</span>
        </p>
        <div className="mt-0.5 flex justify-between text-[10px] opacity-90">
          <span>DOJ : {dateOnly(node.joinedAt)}</span>
          <span className="capitalize">{node.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-2 border-b border-border px-3 py-1.5 text-[10px] text-text-muted">
        <span className="truncate">
          <span className="text-text-subtle">User ID : </span>
          {node.email || '—'}
        </span>
        <span className="truncate">
          <span className="text-text-subtle">PAN : </span>—
        </span>
      </div>

      <table className="w-full text-[10px]">
        <thead>
          <tr className="bg-neutral-hover text-text-muted">
            <th rowSpan={2} className="px-2 py-1 text-left align-bottom font-semibold">
              Business
            </th>
            <th colSpan={3} className="border-l border-border px-2 py-1 text-center font-semibold">
              L (Group A)
            </th>
            <th colSpan={3} className="border-l border-border px-2 py-1 text-center font-semibold">
              R (Group B)
            </th>
          </tr>
          <tr className="bg-neutral-hover text-text-subtle">
            {['L', 'R'].flatMap((side) =>
              LEG_COLUMNS.map((col, i) => (
                <th
                  key={`${side}-${col}`}
                  className={cn('px-1.5 py-0.5 text-right font-medium', i === 0 && 'border-l border-border')}
                >
                  {col}
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={cn('border-t border-border', row.carry && 'bg-success-bg/50')}>
              <td className={cn('px-2 py-1 text-text-muted', row.carry && 'italic')}>{row.label}</td>
              {row.carry ? (
                <>
                  <td colSpan={3} className="border-l border-border px-1.5 py-1 text-center tabular-nums text-text">
                    {amount(row.left)}
                  </td>
                  <td colSpan={3} className="border-l border-border px-1.5 py-1 text-center tabular-nums text-text">
                    {amount(row.right)}
                  </td>
                </>
              ) : (
                [row.left, row.right].flatMap((leg, side) =>
                  legCells(leg).map((value, i) => (
                    <td
                      key={`${side}-${i}`}
                      className={cn(
                        'px-1.5 py-1 text-right tabular-nums text-text',
                        i === 0 && 'border-l border-border',
                      )}
                    >
                      {value}
                    </td>
                  )),
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {needs && (
        <p className="border-t border-border bg-warning-bg/40 px-2 py-1 text-[10px] text-text-muted">
          Carry waiting on the {needs === 'L' ? 'left' : 'right'} leg to pair.
        </p>
      )}

      <div className="grid grid-cols-3 border-t border-border text-[10px]">
        <div className="px-2 py-1.5">
          <p className="text-text-subtle">Direct ({rates.direct})</p>
          <p className="tabular-nums font-medium text-text">₹{amount(node.income?.direct ?? 0)}</p>
        </div>
        <div className="border-l border-border px-2 py-1.5">
          <p className="text-text-subtle">Matching ({rates.matching})</p>
          <p className="tabular-nums font-medium text-text">₹{amount(node.income?.matching ?? 0)}</p>
        </div>
        <div className="border-l border-border bg-success-bg/60 px-2 py-1.5">
          <p className="text-text-subtle">{plots ? 'Registration Earning' : 'Total Earning'}</p>
          <p className="tabular-nums font-semibold text-success">₹{amount(node.income?.total ?? 0)}</p>
        </div>
      </div>

      {plots && (
        <>
          <div className="grid grid-cols-3 border-t border-border text-[10px]">
            <div className="px-2 py-1.5">
              <p className="text-text-subtle">Plot Direct ({pctLabel(plotConfig.data?.commission.direct)})</p>
              <p className="tabular-nums font-medium text-text">₹{amount(plots.earned.direct)}</p>
            </div>
            <div className="border-l border-border px-2 py-1.5">
              <p className="text-text-subtle">Plot Matching ({pctLabel(plotConfig.data?.commission.matching)})</p>
              <p className="tabular-nums font-medium text-text">₹{amount(plots.earned.matching)}</p>
            </div>
            <div className="border-l border-border bg-success-bg/60 px-2 py-1.5">
              <p className="text-text-subtle">Plot Earning</p>
              <p className="tabular-nums font-semibold text-success">₹{amount(plotTotal)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border bg-success-bg px-2 py-1.5 text-[10px]">
            <span className="font-medium text-text">Total Earning</span>
            <span className="tabular-nums font-semibold text-success">₹{amount((node.income?.total ?? 0) + plotTotal)}</span>
          </div>
        </>
      )}

      <div className="bg-linear-to-r from-blue-700 to-blue-900 px-3 py-1.5 text-[10px] text-white">
        <p>Sponsor PID : {node.sponsorMemberCode ?? '—'}</p>
        <p>
          Parent PID : {node.parentCode ?? '—'}
          {node.isSpillover && <span className="ml-1 opacity-80">(spillover)</span>}
        </p>
      </div>
    </div>,
    document.body,
  )
}

function NodeCard({
  node,
  selected,
  onSelect,
  onDrillDown,
}: { node: AssociateTreeNode; selected: boolean } & SelectHandlers) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)

  // The rect is measured on enter rather than tracked continuously — the tree
  // doesn't move while a node is hovered, and re-measuring on scroll would be
  // needless work.
  const showTooltip = () => setAnchor(wrapperRef.current?.getBoundingClientRect() ?? null)

  return (
    <div
      ref={wrapperRef}
      className="group relative"
      onMouseEnter={showTooltip}
      onMouseLeave={() => setAnchor(null)}
    >
      <button
        type="button"
        onClick={() => onSelect(node._id)}
        onDoubleClick={() => onDrillDown?.(node._id)}
        title={onDrillDown ? 'Click to select · double-click to open this member’s tree' : undefined}
        className={cn(
          'flex w-28 shrink-0 cursor-pointer flex-col items-center gap-1.5 rounded-control px-2 py-2 text-center transition-all hover:-translate-y-0.5',
          selected && 'bg-info-bg/70 ring-2 ring-blue-600 ring-offset-2 ring-offset-surface',
        )}
      >
        <span
          className={cn(
            'relative flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-card ring-2',
            STATUS_RING[node.status] ?? 'ring-border-strong',
          )}
        >
          {node.profileImage?.url ? (
            <img src={node.profileImage.url} alt={node.fullName} className="h-full w-full rounded-full object-cover" />
          ) : (
            <UserCircleIcon className="h-6 w-6 text-blue-400" />
          )}
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white',
              STATUS_DOT[node.status] ?? 'bg-text-subtle',
            )}
          />
        </span>
        <span className="line-clamp-2 text-xs font-medium leading-tight text-text group-hover:text-info">
          {node.fullName}
        </span>
        <span className="font-mono text-[10px] leading-none text-text-subtle">{node.memberCode}</span>
      </button>

      {/* Explicit affordance — double-click alone isn't discoverable. */}
      {onDrillDown && (
        <button
          type="button"
          onClick={() => onDrillDown(node._id)}
          aria-label={`Open ${node.fullName}'s tree`}
          title="Open this member's tree"
          className={cn(
            'absolute right-0 top-0 hidden h-5 w-5 cursor-pointer items-center justify-center rounded-full',
            'border border-border bg-surface text-[10px] text-blue-600 shadow-xs',
            'hover:bg-info-bg group-hover:flex',
          )}
        >
          ⤢
        </button>
      )}

      {anchor && <NodeTooltip node={node} anchor={anchor} />}
    </div>
  )
}

function OpenSlot() {
  return (
    <div className="flex w-28 shrink-0 flex-col items-center gap-1.5 px-2 py-2 text-center opacity-70">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-border-strong bg-surface">
        <UserCircleIcon className="h-5 w-5 text-text-subtle" />
      </span>
      <span className="text-xs font-medium text-text-subtle">Open</span>
    </div>
  )
}

function MoreSlot() {
  return (
    <div className="flex w-28 shrink-0 flex-col items-center gap-1.5 px-2 py-2 text-center opacity-80">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-blue-300 bg-info-bg/60 text-blue-500">
        <span className="text-base leading-none tracking-widest">&#8943;</span>
      </span>
      <span className="text-xs font-medium text-blue-500">More</span>
    </div>
  )
}

export type { AssociateStatus }
