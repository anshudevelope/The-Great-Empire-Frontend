import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAssociate, useDeleteAssociate, useUpdateAssociateStatus } from './hooks'
import { STATUS_TONE } from './statusTone'
import type { AssociateStatus } from '@/types/associate'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tooltip } from '@/components/ui/Tooltip'
import { CheckIcon, PencilIcon, TrashIcon, UserCircleIcon, XIcon } from '@/components/icons/icons'

type PendingAction = 'approve' | 'reject' | 'delete' | null

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-text-subtle">{label}</dt>
      <dd className="mt-0.5 text-sm text-text">{value || value === 0 ? value : '—'}</dd>
    </div>
  )
}

export function AssociateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useAssociate(id)
  const statusMutation = useUpdateAssociateStatus()
  const deleteMutation = useDeleteAssociate()
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6 text-navy-600" />
      </div>
    )
  }

  const associate = data?.data

  if (!associate) {
    return <EmptyState title="Associate not found" description="This record may have been deleted." />
  }

  const sponsor = typeof associate.sponsorId === 'object' ? associate.sponsorId : null

  function closeConfirm() {
    setPendingAction(null)
  }

  function confirmAction() {
    if (!pendingAction || !associate) return
    if (pendingAction === 'delete') {
      deleteMutation.mutate(associate._id, {
        onSuccess: () => navigate('/admin/associates'),
      })
    } else {
      const newStatus: AssociateStatus = pendingAction === 'approve' ? 'approved' : 'rejected'
      statusMutation.mutate({ id: associate._id, status: newStatus }, { onSuccess: closeConfirm })
    }
  }

  const isActionLoading = statusMutation.isPending || deleteMutation.isPending

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-center gap-4">
          {associate.profileImage?.url ? (
            <img
              src={associate.profileImage.url}
              alt={associate.fullName}
              className="h-16 w-16 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-50 text-navy-400">
              <UserCircleIcon className="h-9 w-9" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-text">
              {associate.title} {associate.fullName}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge tone={STATUS_TONE[associate.status]}>{associate.status}</Badge>
              <span className="text-sm text-text-subtle">{associate.tier}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {associate.status !== 'approved' && (
            <Tooltip label="Mark this associate as approved">
              <Button
                variant="success"
                size="sm"
                leftIcon={<CheckIcon className="h-4 w-4" />}
                onClick={() => setPendingAction('approve')}
              >
                Approve
              </Button>
            </Tooltip>
          )}
          {associate.status !== 'rejected' && (
            <Tooltip label="Mark this associate as rejected">
              <Button
                variant="warning"
                size="sm"
                leftIcon={<XIcon className="h-4 w-4" />}
                onClick={() => setPendingAction('reject')}
              >
                Reject
              </Button>
            </Tooltip>
          )}
          <Tooltip label="Edit associate details">
            <Link to={`/admin/associates/${associate._id}/edit`}>
              <Button variant="info" size="sm" leftIcon={<PencilIcon className="h-4 w-4" />}>
                Edit
              </Button>
            </Link>
          </Tooltip>
          <Tooltip label="Permanently delete this associate">
            <Button
              variant="danger"
              size="sm"
              leftIcon={<TrashIcon className="h-4 w-4" />}
              onClick={() => setPendingAction('delete')}
            >
              Delete
            </Button>
          </Tooltip>
        </div>
      </div>

      <section className="rounded-card border border-border bg-white p-5 shadow-card">
        <h2 className="mb-4 text-sm font-semibold text-text">Personal Details</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Father / Husband Name" value={associate.fatherOrHusbandName} />
          <Field label="Marital Status" value={associate.maritalStatus} />
          <Field label="Gender" value={associate.gender} />
          <Field label="Date of Birth" value={associate.dob ? new Date(associate.dob).toLocaleDateString() : undefined} />
          <Field label="Age" value={associate.age} />
        </dl>
      </section>

      <section className="rounded-card border border-border bg-white p-5 shadow-card">
        <h2 className="mb-4 text-sm font-semibold text-text">Contact & Address</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Phone" value={associate.phone} />
          <Field label="Email" value={associate.email} />
          <Field label="Address" value={associate.address} />
          <Field label="City" value={associate.city} />
          <Field label="State" value={associate.state} />
          <Field label="Country" value={associate.country} />
          <Field label="PIN Code" value={associate.pinCode} />
        </dl>
      </section>

      <section className="rounded-card border border-border bg-white p-5 shadow-card">
        <h2 className="mb-4 text-sm font-semibold text-text">Nominee Details</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Nominee Name" value={associate.nomineeName} />
          <Field label="Relation" value={associate.nomineeRelation} />
          <Field label="Nominee Age" value={associate.nomineeAge} />
        </dl>
      </section>

      <section className="rounded-card border border-border bg-white p-5 shadow-card">
        <h2 className="mb-4 text-sm font-semibold text-text">Membership</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Tier" value={associate.tier} />
          <Field label="Sponsor" value={sponsor ? `${sponsor.fullName} (${sponsor.phone})` : 'None'} />
          <Field label="Joined" value={new Date(associate.createdAt).toLocaleDateString()} />
        </dl>
      </section>

      {associate.documents.length > 0 && (
        <section className="rounded-card border border-border bg-white p-5 shadow-card">
          <h2 className="mb-4 text-sm font-semibold text-text">Documents</h2>
          <ul className="flex flex-col gap-2">
            {associate.documents.map((doc) => (
              <li
                key={doc.public_id}
                className="flex items-center justify-between rounded-control border border-border px-3 py-2 text-sm"
              >
                <span className="text-text">{doc.docType}</span>
                <a href={doc.url} target="_blank" rel="noreferrer" className="font-medium text-navy-700 hover:underline">
                  View
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmModal
        open={!!pendingAction}
        title={
          pendingAction === 'delete'
            ? 'Delete associate?'
            : pendingAction === 'approve'
              ? 'Approve associate?'
              : 'Reject associate?'
        }
        description={
          pendingAction === 'delete'
            ? `This will permanently remove ${associate.fullName} and their documents. This action cannot be undone.`
            : pendingAction === 'approve'
              ? `${associate.fullName} will gain approved associate status.`
              : `${associate.fullName} will be marked as rejected.`
        }
        confirmLabel={pendingAction === 'delete' ? 'Delete' : pendingAction === 'approve' ? 'Approve' : 'Reject'}
        tone={pendingAction === 'delete' || pendingAction === 'reject' ? 'danger' : 'primary'}
        isLoading={isActionLoading}
        onConfirm={confirmAction}
        onClose={closeConfirm}
      />
    </div>
  )
}
