import { Link } from 'react-router-dom'
import { useAssociate } from '../hooks'
import { STATUS_TONE } from '../statusTone'
import { Field } from '../AssociateDetailPage'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { UserCircleIcon } from '@/components/icons/icons'

export function AssociateInfoPanel({ associateId }: { associateId: string | null }) {
  const { data, isLoading } = useAssociate(associateId ?? undefined)
  const associate = data?.data

  return (
    <aside className="flex h-fit w-full flex-col overflow-hidden rounded-card border border-border bg-white shadow-card lg:sticky lg:top-20 lg:w-80 lg:shrink-0">
      <div className="bg-linear-to-r from-blue-600 to-blue-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Associate Information</h2>
      </div>

      {!associateId ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-14 text-center">
          <UserCircleIcon className="h-8 w-8 text-text-subtle" />
          <p className="text-sm text-text-subtle">Select a node to view associate details</p>
        </div>
      ) : isLoading || !associate ? (
        <div className="flex justify-center py-14">
          <Spinner className="h-5 w-5 text-blue-600" />
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-3">
            {associate.profileImage?.url ? (
              <img
                src={associate.profileImage.url}
                alt={associate.fullName}
                className="h-12 w-12 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-400">
                <UserCircleIcon className="h-7 w-7" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text">
                {associate.title} {associate.fullName}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Badge tone={STATUS_TONE[associate.status]}>{associate.status}</Badge>
                <span className="text-xs text-text-subtle">{associate.tier}</span>
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3">
            <Field label="Phone" value={associate.phone} />
            <Field label="Email" value={associate.email} />
            <Field label="Position" value={associate.position ?? 'Root'} />
            <Field
              label="Sponsor"
              value={typeof associate.sponsorId === 'object' ? (associate.sponsorId?.fullName ?? null) : null}
            />
            <Field label="Joined" value={new Date(associate.createdAt).toLocaleDateString()} />
          </dl>

          <Link
            to={`/admin/associates/${associate._id}`}
            className="text-center text-sm font-medium text-blue-700 hover:underline"
          >
            View full profile →
          </Link>
        </div>
      )}
    </aside>
  )
}
