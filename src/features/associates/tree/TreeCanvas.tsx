import { useState } from 'react'
import { IconButton } from '@/components/ui/IconButton'
import { MinusIcon, PlusIcon } from '@/components/icons/icons'
import type { AssociateTreeNode } from '@/types/associate'
import { TreeRoot } from './TreeNode'

const MIN_ZOOM = 0.5
const MAX_ZOOM = 1.25
const ZOOM_STEP = 0.15

interface TreeCanvasProps {
  root: AssociateTreeNode
  selectedId: string | null
  onSelect: (id: string) => void
  /** Re-root the canvas on a member — double-click a node or use its ⤢ button. */
  onDrillDown?: (id: string) => void
}

export function TreeCanvas({ root, selectedId, onSelect, onDrillDown }: TreeCanvasProps) {
  const [zoom, setZoom] = useState(1)

  return (
    <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-card border border-border bg-white shadow-card">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-control border border-border bg-white/95 p-1 shadow-card backdrop-blur">
        <IconButton
          icon={<MinusIcon className="h-4 w-4" />}
          label="Zoom out"
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
        />
        <span className="w-10 text-center text-xs font-medium text-text-subtle">{Math.round(zoom * 100)}%</span>
        <IconButton
          icon={<PlusIcon className="h-4 w-4" />}
          label="Zoom in"
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
        />
      </div>
      <div className="scrollbar-thin h-full overflow-auto px-10 py-10">
        <div
          className="flex w-fit min-w-full justify-center transition-transform duration-150"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        >
          <TreeRoot root={root} selectedId={selectedId} onSelect={onSelect} onDrillDown={onDrillDown} />
        </div>
      </div>
    </div>
  )
}
