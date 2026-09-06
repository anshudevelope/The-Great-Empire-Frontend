import { UserCircleIcon } from '@/components/icons/icons'
import { cn } from '@/lib/cn'
import type { AssociateStatus, AssociateTreeNode } from '@/types/associate'

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
  value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

/**
 * Hover card, modelled on the reference platform's genealogy tooltip.
 *
 * Identity and placement are real. The per-leg business figures are structural
 * placeholders — there is no commission engine yet, so they read 0.00 rather
 * than pretending to be calculated.
 */
function NodeTooltip({ node }: { node: AssociateTreeNode }) {
  const rows = [
    { label: 'Tier I (Carry)', carry: true },
    { label: 'Tier I', carry: false },
    { label: 'Tier II (Carry)', carry: true },
    { label: 'Tier II', carry: false },
  ]

  return (
    <div
      role="tooltip"
      className={cn(
        'pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-72 -translate-x-1/2 overflow-hidden',
        'rounded-card border border-border bg-white text-left shadow-popover group-hover:block',
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
            <th className="px-2 py-1 text-left font-semibold">Business</th>
            <th className="px-2 py-1 text-left font-semibold">L (Group A)</th>
            <th className="px-2 py-1 text-left font-semibold">R (Group B)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={cn('border-t border-border', row.carry && 'bg-success-bg/50')}>
              <td className={cn('px-2 py-1 text-text-muted', row.carry && 'italic')}>{row.label}</td>
              <td className="px-2 py-1 text-text">{row.carry ? '0.00' : '0 / 0.00'}</td>
              <td className="px-2 py-1 text-text">{row.carry ? '0.00' : '0 / 0.00'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bg-linear-to-r from-blue-700 to-blue-900 px-3 py-1.5 text-[10px] text-white">
        <p>Sponsor PID : {node.sponsorCode ?? '—'}</p>
        <p>
          Parent PID : {node.parentCode ?? '—'}
          {node.isSpillover && <span className="ml-1 opacity-80">(spillover)</span>}
        </p>
      </div>
    </div>
  )
}

function NodeCard({
  node,
  selected,
  onSelect,
  onDrillDown,
}: { node: AssociateTreeNode; selected: boolean } & SelectHandlers) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onSelect(node._id)}
        onDoubleClick={() => onDrillDown?.(node._id)}
        title={onDrillDown ? 'Click to select · double-click to open this member’s tree' : undefined}
        className={cn(
          'flex w-28 shrink-0 cursor-pointer flex-col items-center gap-1.5 rounded-control px-2 py-2 text-center transition-all hover:-translate-y-0.5',
          selected && 'bg-blue-50/70 ring-2 ring-blue-600 ring-offset-2 ring-offset-surface',
        )}
      >
        <span
          className={cn(
            'relative flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-card ring-2',
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
        <span className="line-clamp-2 text-xs font-medium leading-tight text-text group-hover:text-blue-700">
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
            'border border-border bg-white text-[10px] text-blue-600 shadow-xs',
            'hover:bg-blue-50 group-hover:flex',
          )}
        >
          ⤢
        </button>
      )}

      <NodeTooltip node={node} />
    </div>
  )
}

function OpenSlot() {
  return (
    <div className="flex w-28 shrink-0 flex-col items-center gap-1.5 px-2 py-2 text-center opacity-70">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-border-strong bg-white">
        <UserCircleIcon className="h-5 w-5 text-text-subtle" />
      </span>
      <span className="text-xs font-medium text-text-subtle">Open</span>
    </div>
  )
}

function MoreSlot() {
  return (
    <div className="flex w-28 shrink-0 flex-col items-center gap-1.5 px-2 py-2 text-center opacity-80">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-blue-300 bg-blue-50/60 text-blue-500">
        <span className="text-base leading-none tracking-widest">&#8943;</span>
      </span>
      <span className="text-xs font-medium text-blue-500">More</span>
    </div>
  )
}

export type { AssociateStatus }
