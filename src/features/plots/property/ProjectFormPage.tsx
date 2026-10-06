import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createProject, fetchProject, updateProject, type Project, type ProjectInput } from '@/api/plots'
import { ApiRequestError } from '@/api/fetchClient'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Textarea } from '@/components/ui/Textarea'
import { PlusIcon, XIcon } from '@/components/icons/icons'
import { FieldGrid, PageHeader, Section, TabStrip } from '../PlotUi'
import { PROJECT_STATUS_LABEL, isoDay } from '../format'
import { useCompanyOptions } from '../hooks'

type Tab = 'basics' | 'location' | 'marketing' | 'legal' | 'media'
const TABS: { value: Tab; label: string }[] = [
  { value: 'basics', label: 'Basics' },
  { value: 'location', label: 'Location' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'legal', label: 'Legal' },
  { value: 'media', label: 'Media' },
]

const blank: ProjectInput = {
  company: '',
  name: '',
  projectStatus: 'ongoing',
  launchDate: '',
  possessionDate: '',
  allotmentPct: '',
  visible: true,
  status: 'active',
  location: { address: '', city: '', state: 'Uttar Pradesh', pinCode: '', mapsUrl: '', lat: '', lng: '', landmarks: [] },
  marketing: { shortDescription: '', description: '', amenities: [], highlights: [] },
  legal: { reraNumber: '', approvals: [], registryDetails: '' },
  media: { cover: '', layoutMap: '', brochure: '', gallery: [], videoUrl: '' },
}

const toInput = (p: Project): ProjectInput => ({
  company: typeof p.company === 'string' ? p.company : p.company._id,
  name: p.name,
  projectStatus: p.projectStatus,
  launchDate: isoDay(p.launchDate),
  possessionDate: isoDay(p.possessionDate),
  allotmentPct: String(p.allotmentPct ?? ''),
  visible: p.visible,
  status: p.status,
  location: {
    ...p.location,
    lat: p.location.lat == null ? '' : String(p.location.lat),
    lng: p.location.lng == null ? '' : String(p.location.lng),
  },
  marketing: p.marketing,
  legal: p.legal,
  media: {
    cover: p.media.cover?.url ?? '',
    layoutMap: p.media.layoutMap?.url ?? '',
    brochure: p.media.brochure?.url ?? '',
    gallery: (p.media.gallery ?? []).map((g) => g.url),
    videoUrl: p.media.videoUrl ?? '',
  },
})

// "Park\nGated" ⇄ ['Park', 'Gated']
const lines = (list: string[]) => list.join('\n')
const toList = (text: string) => text.split('\n').map((s) => s.trim()).filter(Boolean)

/** Add / edit a project. Tabs keep a long form manageable; one Save covers all of them. */
export function ProjectFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id && id !== 'new'
  const query = useQuery({ queryKey: ['plot-project', id], queryFn: () => fetchProject(id!), enabled: isEdit })

  if (isEdit && query.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }
  if (isEdit && !query.data) return <p className="text-sm text-danger">Project not found.</p>

  // Keyed so the form re-initialises when moving between projects.
  return <ProjectForm key={id ?? 'new'} project={query.data?.data ?? null} />
}

function ProjectForm({ project }: { project: Project | null }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const companies = useCompanyOptions()
  const [tab, setTab] = useState<Tab>('basics')
  const [form, setForm] = useState<ProjectInput>(() => (project ? toInput(project) : blank))
  // Lists are edited as text so typing a newline isn't fought by trimming.
  const [text, setText] = useState(() => ({
    landmarks: lines(form.location.landmarks),
    amenities: lines(form.marketing.amenities),
    highlights: lines(form.marketing.highlights),
  }))

  const patch = <K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) => setForm((f) => ({ ...f, [key]: value }))
  const setIn =
    <K extends 'location' | 'marketing' | 'legal' | 'media'>(group: K, key: keyof ProjectInput[K]) =>
    (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [group]: { ...f[group], [key]: e.target.value } }))

  const save = useMutation({
    mutationFn: () => {
      const body: ProjectInput = {
        ...form,
        location: { ...form.location, landmarks: toList(text.landmarks) },
        marketing: { ...form.marketing, amenities: toList(text.amenities), highlights: toList(text.highlights) },
        media: { ...form.media, gallery: form.media.gallery.filter(Boolean) },
      }
      return project ? updateProject(project._id, body) : createProject(body)
    },
    onSuccess: (res) => {
      toast.success(project ? 'Project saved' : 'Project created')
      void queryClient.invalidateQueries({ queryKey: ['plot-projects'] })
      void queryClient.invalidateQueries({ queryKey: ['plot-project'] })
      if (!project) navigate(`/admin/property/projects/${res.data._id}`, { replace: true })
    },
    onError: (error) => toast.error(error instanceof ApiRequestError ? error.message : 'Save failed'),
  })

  const approvals = form.legal.approvals
  const setApproval = (i: number, key: 'authority' | 'number', value: string) =>
    patch('legal', { ...form.legal, approvals: approvals.map((a, j) => (j === i ? { ...a, [key]: value } : a)) })
  const gallery = form.media.gallery

  return (
    <div className="pb-10">
      <PageHeader
        title={project ? project.name : 'Add project'}
        description={project ? `${project.code} · /${project.slug}` : 'Basics are required; the other tabs can be filled in any time.'}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/admin/property/projects')}>
              Back to projects
            </Button>
            <Button onClick={() => save.mutate()} isLoading={save.isPending}>
              {project ? 'Save project' : 'Create project'}
            </Button>
          </>
        }
      />

      <TabStrip tabs={TABS} value={tab} onChange={setTab} />

      {tab === 'basics' && (
        <Section>
          <FieldGrid>
            <FormField label="Company" htmlFor="pj-company" required>
              <Select id="pj-company" value={form.company} onChange={(e) => patch('company', e.target.value)}>
                <option value="">Select company</option>
                {companies.data?.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Project name" htmlFor="pj-name" required>
              <Input id="pj-name" value={form.name} onChange={(e) => patch('name', e.target.value)} />
            </FormField>
            <FormField label="Stage" htmlFor="pj-stage">
              <Select id="pj-stage" value={form.projectStatus} onChange={(e) => patch('projectStatus', e.target.value as ProjectInput['projectStatus'])}>
                {Object.entries(PROJECT_STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Launch date" htmlFor="pj-launch">
              <Input id="pj-launch" type="date" value={form.launchDate} onChange={(e) => patch('launchDate', e.target.value)} />
            </FormField>
            <FormField label="Possession date" htmlFor="pj-possession">
              <Input id="pj-possession" type="date" value={form.possessionDate} onChange={(e) => patch('possessionDate', e.target.value)} />
            </FormField>
            <FormField label="Allotment %" htmlFor="pj-allot" hint="Share of the price paid before a plot counts as allotted.">
              <Input id="pj-allot" inputMode="decimal" value={form.allotmentPct} onChange={(e) => patch('allotmentPct', e.target.value)} />
            </FormField>
            <FormField label="Status" htmlFor="pj-status">
              <Select id="pj-status" value={form.status} onChange={(e) => patch('status', e.target.value as ProjectInput['status'])}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </FormField>
            <FormField label="Website" htmlFor="pj-visible">
              <label className="flex h-10 items-center gap-2 text-sm text-text">
                <input
                  id="pj-visible"
                  type="checkbox"
                  checked={form.visible}
                  onChange={(e) => patch('visible', e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-info)]"
                />
                Show this project on the website
              </label>
            </FormField>
          </FieldGrid>
        </Section>
      )}

      {tab === 'location' && (
        <Section>
          <FieldGrid>
            <FormField label="Address" htmlFor="pj-address" className="sm:col-span-2 lg:col-span-3">
              <Textarea id="pj-address" rows={2} value={form.location.address} onChange={setIn('location', 'address')} />
            </FormField>
            <FormField label="City" htmlFor="pj-city">
              <Input id="pj-city" value={form.location.city} onChange={setIn('location', 'city')} />
            </FormField>
            <FormField label="State" htmlFor="pj-state">
              <Input id="pj-state" value={form.location.state} onChange={setIn('location', 'state')} />
            </FormField>
            <FormField label="Pin code" htmlFor="pj-pin">
              <Input id="pj-pin" inputMode="numeric" value={form.location.pinCode} onChange={setIn('location', 'pinCode')} />
            </FormField>
            <FormField label="Google Maps link" htmlFor="pj-maps" className="sm:col-span-2 lg:col-span-3">
              <Input id="pj-maps" type="url" value={form.location.mapsUrl} onChange={setIn('location', 'mapsUrl')} placeholder="https://maps.google.com/…" />
            </FormField>
            <FormField label="Latitude" htmlFor="pj-lat">
              <Input id="pj-lat" inputMode="decimal" value={form.location.lat} onChange={setIn('location', 'lat')} />
            </FormField>
            <FormField label="Longitude" htmlFor="pj-lng">
              <Input id="pj-lng" inputMode="decimal" value={form.location.lng} onChange={setIn('location', 'lng')} />
            </FormField>
            <FormField label="Nearby landmarks" htmlFor="pj-landmarks" hint="One per line." className="sm:col-span-2 lg:col-span-3">
              <Textarea id="pj-landmarks" rows={3} value={text.landmarks} onChange={(e) => setText((t) => ({ ...t, landmarks: e.target.value }))} />
            </FormField>
          </FieldGrid>
        </Section>
      )}

      {tab === 'marketing' && (
        <Section>
          <FieldGrid columns={2}>
            <FormField label="Short description" htmlFor="pj-short" hint="One or two lines for cards and listings." className="sm:col-span-2">
              <Input id="pj-short" value={form.marketing.shortDescription} onChange={setIn('marketing', 'shortDescription')} />
            </FormField>
            <FormField label="Full description" htmlFor="pj-desc" className="sm:col-span-2">
              <Textarea id="pj-desc" rows={6} value={form.marketing.description} onChange={setIn('marketing', 'description')} />
            </FormField>
            <FormField label="Amenities" htmlFor="pj-amenities" hint="One per line, e.g. Park, Gated entry.">
              <Textarea id="pj-amenities" rows={5} value={text.amenities} onChange={(e) => setText((t) => ({ ...t, amenities: e.target.value }))} />
            </FormField>
            <FormField label="Highlights" htmlFor="pj-highlights" hint="One per line, e.g. 5 min from highway.">
              <Textarea id="pj-highlights" rows={5} value={text.highlights} onChange={(e) => setText((t) => ({ ...t, highlights: e.target.value }))} />
            </FormField>
          </FieldGrid>
        </Section>
      )}

      {tab === 'legal' && (
        <Section>
          <FieldGrid columns={2}>
            <FormField label="RERA number" htmlFor="pj-rera">
              <Input id="pj-rera" value={form.legal.reraNumber} onChange={setIn('legal', 'reraNumber')} />
            </FormField>
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium text-text">Approvals</p>
              <div className="flex flex-col gap-2">
                {approvals.map((a, i) => (
                  <div key={i} className="flex gap-2">
                    <Input aria-label="Authority" placeholder="Authority (e.g. PDA)" value={a.authority} onChange={(e) => setApproval(i, 'authority', e.target.value)} />
                    <Input aria-label="Approval number" placeholder="Approval number" value={a.number} onChange={(e) => setApproval(i, 'number', e.target.value)} />
                    <RemoveButton onClick={() => patch('legal', { ...form.legal, approvals: approvals.filter((_, j) => j !== i) })} />
                  </div>
                ))}
                <AddButton onClick={() => patch('legal', { ...form.legal, approvals: [...approvals, { authority: '', number: '' }] })}>
                  Add approval
                </AddButton>
              </div>
            </div>
            <FormField label="Registry / khasra details" htmlFor="pj-registry" className="sm:col-span-2">
              <Textarea id="pj-registry" rows={4} value={form.legal.registryDetails} onChange={setIn('legal', 'registryDetails')} />
            </FormField>
          </FieldGrid>
        </Section>
      )}

      {tab === 'media' && (
        <Section>
          <p className="mb-4 text-xs text-text-subtle">Paste links for now — uploads will be added later.</p>
          <FieldGrid columns={2}>
            <UrlWithPreview id="pj-cover" label="Cover image" value={form.media.cover} onChange={setIn('media', 'cover')} />
            <UrlWithPreview id="pj-layout" label="Layout / site map" value={form.media.layoutMap} onChange={setIn('media', 'layoutMap')} />
            <FormField label="Brochure (PDF link)" htmlFor="pj-brochure">
              <Input id="pj-brochure" type="url" value={form.media.brochure} onChange={setIn('media', 'brochure')} placeholder="https://…" />
            </FormField>
            <FormField label="Video link" htmlFor="pj-video">
              <Input id="pj-video" type="url" value={form.media.videoUrl} onChange={setIn('media', 'videoUrl')} placeholder="https://youtube.com/…" />
            </FormField>
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium text-text">Gallery</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {gallery.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {url ? (
                      <img src={url} alt="" className="h-10 w-14 shrink-0 rounded-control object-cover" />
                    ) : (
                      <span className="h-10 w-14 shrink-0 rounded-control bg-neutral-hover" />
                    )}
                    <Input
                      aria-label={`Gallery image ${i + 1}`}
                      type="url"
                      value={url}
                      placeholder="https://…"
                      onChange={(e) => patch('media', { ...form.media, gallery: gallery.map((g, j) => (j === i ? e.target.value : g)) })}
                    />
                    <RemoveButton onClick={() => patch('media', { ...form.media, gallery: gallery.filter((_, j) => j !== i) })} />
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <AddButton onClick={() => patch('media', { ...form.media, gallery: [...gallery, ''] })}>Add image</AddButton>
              </div>
            </div>
          </FieldGrid>
        </Section>
      )}
    </div>
  )
}

function UrlWithPreview({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (e: { target: { value: string } }) => void }) {
  return (
    <FormField label={label} htmlFor={id}>
      <div className="flex items-center gap-2">
        {value ? (
          <img src={value} alt="" className="h-10 w-14 shrink-0 rounded-control object-cover" />
        ) : (
          <span className="h-10 w-14 shrink-0 rounded-control bg-neutral-hover" />
        )}
        <Input id={id} type="url" value={value} onChange={onChange} placeholder="https://…" />
      </div>
    </FormField>
  )
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <Button size="sm" variant="secondary" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={onClick}>
      {children}
    </Button>
  )
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove"
      className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-control text-text-subtle hover:bg-danger-bg hover:text-danger"
    >
      <XIcon className="h-4 w-4" />
    </button>
  )
}
