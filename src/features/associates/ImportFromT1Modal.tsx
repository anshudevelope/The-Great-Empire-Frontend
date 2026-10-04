import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { fetchImportProfile, searchImportCandidates, type ImportProfile } from '@/api/associates'
import { ApiRequestError } from '@/api/fetchClient'
import { cn } from '@/lib/cn'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { CheckIcon, SearchIcon } from '@/components/icons/icons'

interface ImportFromT1ModalProps {
  open: boolean
  onClose: () => void
  /** Called with the chosen member's full T1 profile. */
  onImport: (profile: ImportProfile) => void
}

/**
 * T2 Register: pick one T1 member to start the form from. Members whose email
 * already has a T2 account are shown but can't be picked.
 */
export function ImportFromT1Modal({ open, onClose, onImport }: ImportFromT1ModalProps) {
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Debounced so the search endpoint isn't hit on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 250)
    return () => clearTimeout(timer)
  }, [term])

  const { data, isFetching } = useQuery({
    queryKey: ['import-candidates', debounced],
    queryFn: () => searchImportCandidates(debounced),
    enabled: open,
  })
  const candidates = data?.data ?? []

  const load = useMutation({
    mutationFn: (id: string) => fetchImportProfile(id),
    onSuccess: (response) => {
      onImport(response.data)
      close()
    },
    onError: (error) =>
      toast.error(error instanceof ApiRequestError ? error.message : 'Could not load that associate.'),
  })

  function close() {
    setTerm('')
    setSelectedId(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={close} title="Import from T1" size="lg">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">
          Choose a T1 (Insurance) associate. Their details, password, photo and documents are copied into this form —
          you only add the sponsor, placement and payment.
        </p>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-subtle" />
          <Input
            autoFocus
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search by associate ID, name, email or phone"
            className="pl-9"
            aria-label="Search T1 associates"
          />
        </div>

        <div role="radiogroup" aria-label="T1 associates" className="max-h-80 overflow-y-auto rounded-control border border-border">
          {isFetching && !candidates.length ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-5 w-5" />
            </div>
          ) : !candidates.length ? (
            <p className="px-4 py-8 text-center text-sm text-text-subtle">No T1 associates match.</p>
          ) : (
            candidates.map((candidate) => {
              const selected = candidate._id === selectedId
              return (
                <button
                  key={candidate._id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={candidate.alreadyImported}
                  onClick={() => setSelectedId(candidate._id)}
                  className={cn(
                    'flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 transition-colors',
                    candidate.alreadyImported
                      ? 'cursor-not-allowed opacity-50'
                      : selected
                        ? 'cursor-pointer bg-info-bg'
                        : 'cursor-pointer hover:bg-neutral-hover',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                      selected ? 'border-info bg-info text-surface' : 'border-border-strong',
                    )}
                  >
                    {selected && <CheckIcon className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text">
                      <span className="font-mono text-text-muted">{candidate.memberCode ?? '—'}</span> · {candidate.fullName}
                    </span>
                    <span className="block truncate text-xs text-text-subtle">
                      {candidate.email} · {candidate.phone}
                    </span>
                  </span>
                  {candidate.alreadyImported && (
                    <span className="shrink-0 rounded-pill border border-border px-2 py-0.5 text-[11px] font-medium text-text-muted">
                      Already in T2
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectedId}
            isLoading={load.isPending}
            onClick={() => selectedId && load.mutate(selectedId)}
          >
            Import
          </Button>
        </div>
      </div>
    </Modal>
  )
}
