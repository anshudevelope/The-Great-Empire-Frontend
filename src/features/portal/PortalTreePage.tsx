import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchBinaryTree, fetchSponsorTree } from '@/api/tree'
import type { SponsorTreeNode } from '@/api/tree'
import type { AssociateTreeNode } from '@/types/associate'
import { TreeCanvas } from '@/features/associates/tree/TreeCanvas'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/cn'

type View = 'binary' | 'sponsor'

/**
 * Two views of the same people.
 *
 * Binary = where they SIT (placement, max two children, spillover).
 * Sponsor = who INTRODUCED them (unlimited children, never changes).
 * They diverge from the third recruit onward, which is exactly what this page
 * is meant to make visible.
 */
export function PortalTreePage() {
  const [view, setView] = useState<View>('binary')
  const [depth, setDepth] = useState(4)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Undefined means "me". Drilling down re-roots on a downline member; the API
  // still refuses anything outside the caller's own subtree.
  const [rootId, setRootId] = useState<string | undefined>(undefined)

  const binary = useQuery({
    queryKey: ['binary-tree', depth, rootId],
    queryFn: () => fetchBinaryTree(rootId, depth),
    enabled: view === 'binary',
  })

  const sponsor = useQuery({
    queryKey: ['sponsor-tree', depth],
    queryFn: () => fetchSponsorTree(undefined, depth),
    enabled: view === 'sponsor',
  })

  const loading = view === 'binary' ? binary.isLoading : sponsor.isLoading

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">My tree</h1>
          <p className="mt-1 text-sm text-text-subtle">
            {view === 'binary'
              ? 'Where your members sit — two slots per person, spillover fills the rest.'
              : 'Who you personally referred — no limit on how many.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {rootId && (
            <button
              type="button"
              onClick={() => setRootId(undefined)}
              className="cursor-pointer rounded-control border border-border-strong bg-white px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-neutral-hover"
            >
              ← Back to my tree
            </button>
          )}
          <div className="flex rounded-control border border-border-strong bg-white p-0.5">
            {(['binary', 'sponsor'] as View[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                className={cn(
                  'cursor-pointer rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                  view === option ? 'bg-blue-600 text-white' : 'text-text-muted hover:text-text',
                )}
              >
                {option === 'binary' ? 'Binary' : 'Sponsor'}
              </button>
            ))}
          </div>
          <Select value={String(depth)} onChange={(event) => setDepth(Number(event.target.value))} containerClassName="w-32">
            {[2, 3, 4, 5, 6].map((value) => (
              <option key={value} value={value}>
                {value} levels
              </option>
            ))}
          </Select>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : view === 'binary' ? (
        binary.data ? (
          <TreeCanvas
            root={binary.data.data as unknown as AssociateTreeNode}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDrillDown={setRootId}
          />
        ) : (
          <EmptyState title="No tree yet" description="Add your first member to start building your network." />
        )
      ) : sponsor.data ? (
        <div className="flex-1 overflow-auto rounded-card border border-border bg-white p-6">
          <SponsorBranch node={sponsor.data.data} />
        </div>
      ) : (
        <EmptyState title="No referrals yet" />
      )}
    </div>
  )
}

function SponsorBranch({ node, level = 0 }: { node: SponsorTreeNode; level?: number }) {
  return (
    <div className={level > 0 ? 'ml-6 border-l border-border pl-4' : ''}>
      <div className="flex items-center gap-2 py-1.5">
        <span className="font-mono text-xs text-text-subtle">{node.memberCode}</span>
        <span className="text-sm font-medium text-text">{node.fullName}</span>
        {node.directCount > 0 && (
          <span className="rounded-full bg-neutral-hover px-2 py-0.5 text-[10px] text-text-muted">
            {node.directCount} direct{node.directCount === 1 ? '' : 's'}
          </span>
        )}
        {node.isSpillover && (
          <span className="rounded-full bg-info-bg px-2 py-0.5 text-[10px] text-info">spillover</span>
        )}
      </div>
      {node.children.map((child) => (
        <SponsorBranch key={child._id} node={child} level={level + 1} />
      ))}
      {node.hasMore && <p className="ml-6 py-1 text-xs text-text-subtle">…more below</p>}
    </div>
  )
}
