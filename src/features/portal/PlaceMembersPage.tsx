import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPendingPlacement } from '@/api/associates'
import type { PendingMember } from '@/api/associates'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatShortDate } from '@/lib/datetime'
import { formatTier } from '@/lib/tier'
import { PlaceMemberDialog } from './PlaceMemberDialog'

/**
 * Associates the admin registered under the signed-in sponsor who are not in
 * the tree yet. The sponsor's only job here is placement: which parent (them
 * or anyone below them) and which leg.
 */
export function PlaceMembersPage() {
  const { data, isLoading } = useQuery({ queryKey: ['pending-placement'], queryFn: fetchPendingPlacement })
  const [placing, setPlacing] = useState<PendingMember | null>(null)
  const rows = data?.data ?? []

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-text">Place members</h1>
        <p className="mt-1 text-sm text-text-subtle">
          Associates registered under your referral who are not in your tree yet. Choose the parent — you or anyone
          below you — and the leg.
        </p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nobody waiting to be placed"
          description="When the admin registers someone under you, they appear here."
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-text-subtle">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Tier</th>
                <th className="px-4 py-3 font-semibold">Registered</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id} className="border-b border-border last:border-0 hover:bg-neutral-hover/60">
                  <td className="px-4 py-3 font-mono text-xs text-text">{row.memberCode}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-text">{row.fullName}</span>
                    <span className="block text-xs text-text-subtle">{row.email}</span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {formatTier(row.tier)}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{formatShortDate(row.joinedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" onClick={() => setPlacing(row)}>
                      Place
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Keyed per member so every opening starts from a clean selection. */}
      {placing && <PlaceMemberDialog key={placing._id} member={placing} onClose={() => setPlacing(null)} />}
    </div>
  )
}
