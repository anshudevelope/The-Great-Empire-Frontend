import { UserCircleIcon } from '@/components/icons/icons'
import { cn } from '@/lib/cn'
import type { AssociateStatus, AssociateTreeNode } from '@/types/associate'

const STATUS_RING: Record<AssociateStatus, string> = {
  approved: 'ring-blue-500',
  pending: 'ring-warning',
  rejected: 'ring-danger',
}

const STATUS_DOT: Record<AssociateStatus, string> = {
  approved: 'bg-success',
  pending: 'bg-warning',
  rejected: 'bg-danger',
}

interface SelectHandlers {
  selectedId: string | null
  onSelect: (id: string) => void
}

export function TreeRoot({ root, selectedId, onSelect }: { root: AssociateTreeNode } & SelectHandlers) {
  return (
    <ul className="org-tree">
      <TreeBranch associateId={root._id} node={root} selectedId={selectedId} onSelect={onSelect} />
    </ul>
  )
}

function TreeBranch({ node, selectedId, onSelect }: { associateId: string; node: AssociateTreeNode } & SelectHandlers) {
  const hasLeft = !!node.leftChild
  const hasRight = !!node.rightChild

  return (
    <li>
      <NodeCard node={node} selected={node._id === selectedId} onSelect={onSelect} />
      {(hasLeft || hasRight) && (
        <ul>
          <ChildSlot childId={node.leftChild} childNode={node.left} selectedId={selectedId} onSelect={onSelect} />
          <ChildSlot childId={node.rightChild} childNode={node.right} selectedId={selectedId} onSelect={onSelect} />
        </ul>
      )}
    </li>
  )
}

function ChildSlot({
  childId,
  childNode,
  selectedId,
  onSelect,
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

  return <TreeBranch associateId={childId} node={childNode} selectedId={selectedId} onSelect={onSelect} />
}

function NodeCard({ node, selected, onSelect }: { node: AssociateTreeNode; selected: boolean; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(node._id)}
      className={cn(
        'group flex w-28 shrink-0 cursor-pointer flex-col items-center gap-1.5 rounded-control px-2 py-2 text-center transition-all hover:-translate-y-0.5',
        selected && 'bg-blue-50/70 ring-2 ring-blue-600 ring-offset-2 ring-offset-surface',
      )}
    >
      <span
        className={cn(
          'relative flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-card ring-2',
          STATUS_RING[node.status],
        )}
      >
        {node.profileImage?.url ? (
          <img src={node.profileImage.url} alt={node.fullName} className="h-full w-full rounded-full object-cover" />
        ) : (
          <UserCircleIcon className="h-6 w-6 text-blue-400" />
        )}
        <span
          className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white', STATUS_DOT[node.status])}
        />
      </span>
      <span className="line-clamp-2 text-xs font-medium leading-tight text-text group-hover:text-blue-700">
        {node.fullName}
      </span>
    </button>
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
