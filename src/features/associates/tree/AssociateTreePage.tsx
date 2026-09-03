import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAssociates, useAssociateTree } from '../hooks'
import { TreeCanvas } from './TreeCanvas'
import { AssociateInfoPanel } from './AssociateInfoPanel'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { PlusIcon, SearchIcon } from '@/components/icons/icons'
import type { AssociateTreeNode } from '@/types/associate'

const DEPTH_OPTIONS = [2, 3, 4, 5]

export function AssociateTreePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [depth, setDepth] = useState(3)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  const allAssociatesQuery = useAssociates({})

  const defaultRootId = useMemo(() => {
    const list = allAssociatesQuery.data?.data ?? []
    const roots = list.filter((associate) => !associate.parentId)
    const pool = roots.length > 0 ? roots : list
    if (pool.length === 0) return undefined
    return [...pool].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]._id
  }, [allAssociatesQuery.data])

  const rootId = id ?? defaultRootId
  const treeQuery = useAssociateTree(rootId, depth)

  const searchResults = useMemo(() => {
    if (!search) return []
    const query = search.toLowerCase()
    const list = allAssociatesQuery.data?.data ?? []
    return list
      .filter(
        (associate) =>
          associate.fullName.toLowerCase().includes(query) ||
          associate.email.toLowerCase().includes(query) ||
          associate.phone.includes(query),
      )
      .slice(0, 6)
  }, [search, allAssociatesQuery.data])

  function selectRoot(newId: string) {
    setSearchInput('')
    setSearch('')
    navigate(`/admin/associates/tree/${newId}`)
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-text">Associate Tree</h1>
        <p className="mt-1 text-sm text-text-subtle">Binary placement structure — left and right legs.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-card border border-border bg-white p-4 shadow-card sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
          <Input
            placeholder="Search associate by name, email or phone to set as root"
            className="pl-9"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-control border border-border bg-white shadow-popover">
              {searchResults.map((associate) => (
                <button
                  key={associate._id}
                  type="button"
                  onClick={() => selectRoot(associate._id)}
                  className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-neutral-hover"
                >
                  <span className="font-medium text-text">{associate.fullName}</span>
                  <span className="text-xs text-text-subtle">
                    {associate.phone} · {associate.email}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Select value={String(depth)} onChange={(event) => setDepth(Number(event.target.value))} containerClassName="sm:w-40">
          {DEPTH_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option} levels deep
            </option>
          ))}
        </Select>
      </div>

      {allAssociatesQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-blue-600" />
        </div>
      ) : !rootId ? (
        <EmptyState
          title="No associates yet"
          description="Register your first associate to start building the binary tree."
          action={
            <Link to="/admin/associates/register">
              <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />}>
                Register Associate
              </Button>
            </Link>
          }
        />
      ) : treeQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-blue-600" />
        </div>
      ) : !treeQuery.data?.data ? (
        <EmptyState title="Tree not found" description="This associate could not be loaded." />
      ) : (
        // Keyed by root so the selection resets when the tree's root changes,
        // without needing an effect to reset state in response to a prop change.
        <TreeWithPanel key={rootId} root={treeQuery.data.data} />
      )}
    </div>
  )
}

function TreeWithPanel({ root }: { root: AssociateTreeNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <TreeCanvas root={root} selectedId={selectedId} onSelect={setSelectedId} />
      <AssociateInfoPanel associateId={selectedId} />
    </div>
  )
}
