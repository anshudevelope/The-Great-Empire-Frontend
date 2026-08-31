import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAssociates, useDeleteAssociate, useUpdateAssociateStatus } from './hooks'
import { STATUS_TONE } from './statusTone'
import { cn } from '@/lib/cn'
import type { Associate, AssociateStatus } from '@/types/associate'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton, IconLink } from '@/components/ui/IconButton'
import { Spinner } from '@/components/ui/Spinner'
import { CheckIcon, EyeIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon, XIcon } from '@/components/icons/icons'

const PAGE_SIZE = 10

type StatusFilter = '' | AssociateStatus
type TierFilter = '' | 'Tier I' | 'Tier II'

interface PendingAction {
  type: 'approve' | 'reject' | 'delete'
  associate: Associate
}

export function AssociatesListPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [tier, setTier] = useState<TierFilter>('')
  const [page, setPage] = useState(1)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchInput])

  const { data, isLoading, isFetching } = useAssociates({ search, status, tier })
  const statusMutation = useUpdateAssociateStatus()
  const deleteMutation = useDeleteAssociate()

  const associates = useMemo(() => data?.data ?? [], [data])
  const totalPages = Math.max(1, Math.ceil(associates.length / PAGE_SIZE))
  const pageItems = useMemo(() => associates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [associates, page])

  function closeConfirm() {
    setPendingAction(null)
  }

  function confirmAction() {
    if (!pendingAction) return
    if (pendingAction.type === 'delete') {
      deleteMutation.mutate(pendingAction.associate._id, { onSuccess: closeConfirm })
    } else {
      const newStatus: AssociateStatus = pendingAction.type === 'approve' ? 'approved' : 'rejected'
      statusMutation.mutate({ id: pendingAction.associate._id, status: newStatus }, { onSuccess: closeConfirm })
    }
  }

  const isActionLoading = statusMutation.isPending || deleteMutation.isPending

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-text">Associates</h1>
          <p className="mt-1 text-sm text-text-subtle">{data?.count ?? 0} total records</p>
        </div>
        <Link to="/admin/associates/register">
          <Button leftIcon={<PlusIcon className="h-4 w-4" />}>Register Associate</Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-card border border-border bg-white p-4 shadow-card sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
          <Input
            placeholder="Search by name, email or phone"
            className="pl-9"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as StatusFilter)
            setPage(1)
          }}
          containerClassName="sm:w-44"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
        <Select
          value={tier}
          onChange={(event) => {
            setTier(event.target.value as TierFilter)
            setPage(1)
          }}
          containerClassName="sm:w-36"
        >
          <option value="">All tiers</option>
          <option value="Tier I">Tier I</option>
          <option value="Tier II">Tier II</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-blue-600" />
        </div>
      ) : associates.length === 0 ? (
        <EmptyState
          title="No associates found"
          description="Try adjusting your filters, or register a new associate to get started."
          action={
            <Link to="/admin/associates/register">
              <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />}>
                Register Associate
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="rounded-card border border-border bg-white shadow-card">
            <table className="w-full table-fixed text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-blue-50/60">
                  <th className="w-[22%] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-subtle">
                    Name
                  </th>
                  <th className="w-[26%] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-subtle">
                    Contact
                  </th>
                  <th className="w-[10%] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-subtle">
                    Tier
                  </th>
                  <th className="w-[12%] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-subtle">
                    Status
                  </th>
                  <th className="w-[14%] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-subtle">
                    Joined
                  </th>
                  <th className="w-[16%] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-subtle">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageItems.map((associate) => (
                  <tr
                    key={associate._id}
                    className={cn('transition-colors hover:bg-neutral-hover', isFetching && 'opacity-60')}
                  >
                    <td className="truncate px-4 py-3 align-middle font-medium text-text">
                      {associate.title} {associate.fullName}
                    </td>
                    <td className="px-4 py-3 align-middle text-text">
                      <div className="flex flex-col truncate">
                        <span className="truncate">{associate.email}</span>
                        <span className="truncate text-text-subtle">{associate.phone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-text">{associate.tier}</td>
                    <td className="px-4 py-3 align-middle">
                      <Badge tone={STATUS_TONE[associate.status]}>{associate.status}</Badge>
                    </td>
                    <td className="px-4 py-3 align-middle text-text-subtle">
                      {new Date(associate.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center justify-end gap-1">
                        <IconLink
                          to={`/admin/associates/${associate._id}`}
                          icon={<EyeIcon className="h-4 w-4" />}
                          label="View associate"
                          tone="neutral"
                        />
                        <IconLink
                          to={`/admin/associates/${associate._id}/edit`}
                          icon={<PencilIcon className="h-4 w-4" />}
                          label="Edit associate"
                          tone="info"
                        />
                        {associate.status !== 'approved' && (
                          <IconButton
                            icon={<CheckIcon className="h-4 w-4" />}
                            label="Approve associate"
                            tone="success"
                            onClick={() => setPendingAction({ type: 'approve', associate })}
                          />
                        )}
                        {associate.status !== 'rejected' && (
                          <IconButton
                            icon={<XIcon className="h-4 w-4" />}
                            label="Reject associate"
                            tone="warning"
                            onClick={() => setPendingAction({ type: 'reject', associate })}
                          />
                        )}
                        <IconButton
                          icon={<TrashIcon className="h-4 w-4" />}
                          label="Delete associate"
                          tone="danger"
                          onClick={() => setPendingAction({ type: 'delete', associate })}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-text-muted">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        open={!!pendingAction}
        title={
          pendingAction?.type === 'delete'
            ? 'Delete associate?'
            : pendingAction?.type === 'approve'
              ? 'Approve associate?'
              : 'Reject associate?'
        }
        description={
          pendingAction?.type === 'delete'
            ? `This will permanently remove ${pendingAction.associate.fullName} and their documents. This action cannot be undone.`
            : pendingAction?.type === 'approve'
              ? `${pendingAction.associate.fullName} will gain approved associate status.`
              : `${pendingAction?.associate.fullName ?? ''} will be marked as rejected.`
        }
        confirmLabel={pendingAction?.type === 'delete' ? 'Delete' : pendingAction?.type === 'approve' ? 'Approve' : 'Reject'}
        tone={pendingAction?.type === 'delete' || pendingAction?.type === 'reject' ? 'danger' : 'primary'}
        isLoading={isActionLoading}
        onConfirm={confirmAction}
        onClose={closeConfirm}
      />
    </div>
  )
}
