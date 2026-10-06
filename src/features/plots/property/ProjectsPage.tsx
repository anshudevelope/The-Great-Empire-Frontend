import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { deleteProject, fetchProjects, type Project } from '@/api/plots'
import { ApiRequestError } from '@/api/fetchClient'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { PlusIcon } from '@/components/icons/icons'
import { DataTable, PageHeader, Pager, Td, Th } from '../PlotUi'
import { PROJECT_STATUS_LABEL, day, rowClass } from '../format'
import { useCompanyOptions } from '../hooks'

const companyName = (p: Project) => (typeof p.company === 'string' ? '—' : p.company.name)

/** Property Management → Projects. */
export function ProjectsPage() {
  const queryClient = useQueryClient()
  const [company, setCompany] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<Project | null>(null)
  const companies = useCompanyOptions()

  const { data, isLoading } = useQuery({
    queryKey: ['plot-projects', company, search, page],
    queryFn: () => fetchProjects({ company: company || undefined, search: search || undefined, page: String(page) }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      toast.success('Project deleted')
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: ['plot-projects'] })
    },
    onError: (error) => toast.error(error instanceof ApiRequestError ? error.message : 'Delete failed'),
  })

  const rows = data?.data ?? []

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Sites you sell plots in — with the location, marketing, legal and media details the website will use."
        actions={
          <Link to="/admin/property/projects/new">
            <Button leftIcon={<PlusIcon className="h-4 w-4" />}>Add project</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Search code or name"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="w-full sm:w-72"
        />
        <Select
          value={company}
          onChange={(e) => {
            setCompany(e.target.value)
            setPage(1)
          }}
          containerClassName="w-full sm:w-56"
          aria-label="Company"
        >
          <option value="">All companies</option>
          {companies.data?.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No projects yet" description="Add a project, then create its blocks and plots." />
      ) : (
        <>
          <DataTable
            head={
              <tr>
                <Th>Code</Th>
                <Th>Project</Th>
                <Th>Company</Th>
                <Th>Stage</Th>
                <Th right>Allotment</Th>
                <Th>Launch</Th>
                <Th>Website</Th>
                <Th />
              </tr>
            }
          >
            {rows.map((p) => (
              <tr key={p._id} className={rowClass}>
                <Td className="font-mono text-xs text-text-muted">{p.code}</Td>
                <Td>
                  <div className="flex items-center gap-3">
                    {p.media?.cover?.url ? (
                      <img src={p.media.cover.url} alt="" className="h-9 w-12 rounded-control object-cover" />
                    ) : (
                      <span className="h-9 w-12 rounded-control bg-neutral-hover" />
                    )}
                    <div>
                      <Link to={`/admin/property/projects/${p._id}`} className="font-medium text-text hover:text-info">
                        {p.name}
                      </Link>
                      <span className="block text-xs text-text-subtle">{p.location?.city || '—'}</span>
                    </div>
                  </div>
                </Td>
                <Td className="text-text-muted">{companyName(p)}</Td>
                <Td>
                  <Badge tone={p.projectStatus === 'completed' ? 'success' : p.projectStatus === 'ongoing' ? 'info' : 'warning'}>
                    {PROJECT_STATUS_LABEL[p.projectStatus]}
                  </Badge>
                </Td>
                <Td right>{p.allotmentPct}%</Td>
                <Td className="text-text-muted">{day(p.launchDate)}</Td>
                <Td>
                  <Badge tone={p.visible && p.status === 'active' ? 'success' : 'neutral'}>
                    {p.visible && p.status === 'active' ? 'Shown' : 'Hidden'}
                  </Badge>
                </Td>
                <Td right>
                  <div className="flex justify-end gap-1">
                    <Link to={`/admin/property/blocks?project=${p._id}`}>
                      <Button size="sm" variant="ghost">
                        Blocks
                      </Button>
                    </Link>
                    <Link to={`/admin/property/projects/${p._id}`}>
                      <Button size="sm" variant="ghost">
                        Edit
                      </Button>
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(p)}>
                      Delete
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </DataTable>
          {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
        </>
      )}

      <ConfirmModal
        open={!!deleting}
        title={`Delete ${deleting?.name ?? 'project'}?`}
        description="Only a project with no blocks can be deleted. Mark it inactive instead if it has history."
        confirmLabel="Delete"
        tone="danger"
        isLoading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting._id)}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
