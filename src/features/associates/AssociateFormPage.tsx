import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ASSOCIATE_TIERS,
  ASSOCIATE_TITLES,
  GENDERS,
  MARITAL_STATUSES,
  createAssociateSchema,
  editAssociateSchema,
} from '@/schemas/associate.schema'
import type { AssociateFormValues } from '@/schemas/associate.schema'
import { useAssociate, useCreateAssociate, useUpdateAssociate } from './hooks'
import { RegistrationSuccessModal } from './RegistrationSuccessModal'
import type { RegisterAssociateResponse } from '@/api/associates'
import { AssociateSelect } from '@/components/ui/AssociateSelect'
import { fetchPlacementPreview } from '@/api/associates'
import type { AssociateOption } from '@/api/associates'
import type { SponsorRef } from '@/types/associate'
import { PAYMENT_MODES } from '@/types/referral'
import { todayIST } from '@/lib/datetime'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { IconButton } from '@/components/ui/IconButton'
import { Spinner } from '@/components/ui/Spinner'
import { UploadIcon, XIcon } from '@/components/icons/icons'

const emptyDefaults: AssociateFormValues = {
  title: '' as AssociateFormValues['title'],
  fullName: '',
  fatherOrHusbandName: '',
  maritalStatus: 'Single',
  gender: '' as AssociateFormValues['gender'],
  phone: '',
  email: '',
  password: '',
  dob: '',
  age: '',
  address: '',
  city: '',
  country: 'India',
  state: 'Uttar Pradesh',
  pinCode: '',
  nomineeName: '',
  nomineeRelation: '',
  nomineeAge: '',
  tier: 'Tier I',
  sponsorId: '',
  parentId: '',
  position: '',
  amountPaid: '',
  paymentMode: '',
  paymentRef: '',
  receivedOn: '',
  notes: '',
}

// Sent as-is, blanks included, so clearing a field on Edit really clears it.
// Received by is not among them — the server always records the admin.
const PAYMENT_KEYS = ['amountPaid', 'paymentMode', 'paymentRef', 'receivedOn', 'notes'] as const

interface DocumentRow {
  id: string
  docType: string
  file: File | null
}

function createDocumentRow(): DocumentRow {
  return { id: crypto.randomUUID(), docType: 'KYC Document', file: null }
}

const idOf = (ref: SponsorRef | string | null | undefined) => (typeof ref === 'string' ? ref : (ref?._id ?? ''))

// A populated reference, shaped like a search result so the picker can show it
// as the current value.
function toOption(ref: SponsorRef | string | null | undefined): AssociateOption | null {
  if (!ref || typeof ref !== 'object') return null
  return {
    _id: ref._id,
    memberCode: ref.memberCode ?? null,
    fullName: ref.fullName,
    email: ref.email,
    role: 'associate',
    status: 'approved',
    tier: null,
    treeStatus: 'placed',
    label: `${ref.memberCode ?? '—'} — ${ref.fullName}`,
  }
}

const FULL_ROW = 'sm:col-span-2 lg:col-span-3 xl:col-span-4'
const READONLY_BOX = 'rounded-control border border-border-strong bg-neutral-hover px-3 py-2 text-sm text-text-muted'

/**
 * Admin-only. Register and Edit share one "Membership & Placement" section:
 * the sponsor, then — once there is one — optional placement and an optional
 * payment record.
 */
export function AssociateFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()

  const associateQuery = useAssociate(id)
  const createMutation = useCreateAssociate()
  const updateMutation = useUpdateAssociate(id ?? '')

  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [documentRows, setDocumentRows] = useState<DocumentRow[]>([createDocumentRow()])
  // Register: the server's response, which opens the success popup.
  const [registered, setRegistered] = useState<RegisterAssociateResponse | null>(null)

  const loaded = associateQuery.data?.data
  const isRoot = loaded?.treeStatus === 'root'
  const isUnplaced = loaded?.treeStatus === 'unplaced'

  // Picker values are DERIVED from the loaded associate with an optional
  // override, rather than pushed into state from an effect — setting state in
  // an effect triggers a second render pass and the cascading-render lint rule.
  // On Register nothing is loaded, so they simply start empty.
  const loadedSponsor = useMemo(() => toOption(loaded?.sponsorId), [loaded])
  const loadedParent = useMemo(() => toOption(loaded?.parentId), [loaded])
  const loadedReferrer = useMemo(() => toOption(loaded?.referredBy), [loaded])

  const [sponsorOverride, setSponsor] = useState<AssociateOption | null | undefined>(undefined)
  const [parentOverride, setParentOption] = useState<AssociateOption | null | undefined>(undefined)

  const sponsor = sponsorOverride === undefined ? loadedSponsor : sponsorOverride
  // Someone not in the tree yet usually goes straight under their sponsor.
  const parentOption =
    parentOverride === undefined ? (loadedParent ?? (isUnplaced ? loadedSponsor : null)) : parentOverride

  // Received by is always the admin — read-only, the server sets it. An existing
  // payment keeps whoever first recorded it; a new one gets the admin signed in.
  const adminName = useAuthStore((state) => state.user?.fullName ?? 'Admin')
  const receiverName = loaded?.referral?.receivedBy?.fullName ?? adminName

  const schema = isEdit ? editAssociateSchema : createAssociateSchema

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<AssociateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...emptyDefaults, receivedOn: todayIST() },
  })

  // Register: live spillover preview for the leg chosen under the sponsor.
  const sponsorLeg = useWatch({ control, name: 'position' })
  const preview = useQuery({
    queryKey: ['placement-preview', sponsor?._id, sponsorLeg],
    queryFn: () => fetchPlacementPreview(sponsorLeg ?? '', sponsor?._id),
    enabled: !isEdit && !!sponsor && !!sponsorLeg,
  })

  useEffect(() => {
    if (!isEdit || !associateQuery.data) return
    const associate = associateQuery.data.data
    const sponsorId = idOf(associate.sponsorId)
    const referral = associate.referral

    reset({
      ...emptyDefaults,
      title: associate.title,
      fullName: associate.fullName,
      fatherOrHusbandName: associate.fatherOrHusbandName ?? '',
      maritalStatus: associate.maritalStatus,
      gender: associate.gender,
      phone: associate.phone,
      email: associate.email,
      password: '',
      dob: associate.dob ? associate.dob.slice(0, 10) : '',
      age: associate.age != null ? String(associate.age) : '',
      address: associate.address ?? '',
      city: associate.city ?? '',
      country: associate.country,
      state: associate.state,
      pinCode: associate.pinCode ?? '',
      nomineeName: associate.nomineeName ?? '',
      nomineeRelation: associate.nomineeRelation ?? '',
      nomineeAge: associate.nomineeAge != null ? String(associate.nomineeAge) : '',
      tier: associate.tier,
      sponsorId,
      parentId: idOf(associate.parentId) || (associate.treeStatus === 'unplaced' ? sponsorId : ''),
      position: associate.position ?? '',
      amountPaid: referral ? String(referral.amountPaid) : '',
      paymentMode: referral?.paymentMode ?? '',
      paymentRef: referral?.paymentRef ?? '',
      receivedOn: referral?.receivedOn ? referral.receivedOn.slice(0, 10) : todayIST(),
      notes: referral?.notes ?? '',
    })
  }, [isEdit, associateQuery.data, reset])

  function changeSponsor(option: AssociateOption | null) {
    // An unplaced member follows their sponsor as parent, unless the admin
    // already picked a different parent by hand.
    if (isEdit && isUnplaced && option && (!parentOption || parentOption._id === sponsor?._id)) {
      setParentOption(option)
      setValue('parentId', option._id)
    }
    setSponsor(option)
    setValue('sponsorId', option?._id ?? '', { shouldValidate: true })
    if (!isEdit && !option) setValue('position', '')
  }

  function updateDocumentRow(rowId: string, patch: Partial<DocumentRow>) {
    setDocumentRows((rows) => rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)))
  }

  function addDocumentRow() {
    setDocumentRows((rows) => (rows.length >= 5 ? rows : [...rows, createDocumentRow()]))
  }

  function removeDocumentRow(rowId: string) {
    setDocumentRows((rows) => (rows.length <= 1 ? rows : rows.filter((row) => row.id !== rowId)))
  }

  function onSubmit(values: AssociateFormValues) {
    const formData = new FormData()
    const fields: Record<string, string | undefined> = {
      title: values.title,
      fullName: values.fullName,
      fatherOrHusbandName: values.fatherOrHusbandName,
      maritalStatus: values.maritalStatus,
      gender: values.gender,
      phone: values.phone,
      email: values.email,
      password: values.password,
      dob: values.dob,
      age: values.age,
      address: values.address,
      city: values.city,
      country: values.country,
      state: values.state,
      pinCode: values.pinCode,
      nomineeName: values.nomineeName,
      nomineeRelation: values.nomineeRelation,
      nomineeAge: values.nomineeAge,
      tier: values.tier,
    }

    if (isEdit) {
      // Placement only travels when it actually changed, as a parent + leg pair.
      const placementChanged =
        values.parentId !== idOf(loaded?.parentId) || (values.position ?? '') !== (loaded?.position ?? '')
      if (values.parentId && values.position && placementChanged) {
        fields.parentId = values.parentId
        fields.position = values.position
      }
      if (values.sponsorId && values.sponsorId !== idOf(loaded?.sponsorId)) {
        fields.sponsorId = values.sponsorId
      }
    } else if (values.sponsorId) {
      fields.sponsorId = values.sponsorId
      fields.position = values.position
    }

    for (const [key, value] of Object.entries(fields)) {
      if (value) formData.append(key, value)
    }

    if (values.sponsorId) {
      for (const key of PAYMENT_KEYS) formData.append(key, values[key] ?? '')
      // Tells Edit the payment block was on screen, so blanks mean "clear".
      if (isEdit) formData.append('paymentSubmitted', 'true')
    }

    if (profileImageFile) {
      formData.append('profileImage', profileImageFile)
    }

    documentRows
      .filter((row) => row.file)
      .forEach((row, index) => {
        formData.append('documents', row.file as File)
        formData.append(`docType_${index}`, row.docType)
      })

    if (isEdit && id) {
      updateMutation.mutate(formData, {
        onSuccess: () => navigate(`/admin/associates/${id}`),
      })
    } else {
      createMutation.mutate(formData, {
        onSuccess: (response) => setRegistered(response),
      })
    }
  }

  // A failed check scrolls to the first bad field, but on this long form the
  // small red text under it is easy to miss after clicking Save at the bottom —
  // so also say what's wrong in a toast.
  function onInvalid(formErrors: FieldErrors<AssociateFormValues>) {
    const first = Object.values(formErrors).find((error) => error?.message)
    toast.error(first?.message ? String(first.message) : 'Please fix the highlighted fields.')
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  if (isEdit && associateQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6 text-blue-600" />
      </div>
    )
  }

  const sponsorHint = !isEdit
    ? 'Who referred and paid for them. They start as sponsor and can pass the credit to someone in their team when placing. Leave empty only for the very first associate.'
    : loadedSponsor
      ? 'Changes who gets the sponsor credit. The invoice stays with the person who referred them.'
      : 'Optional — this associate was registered without a sponsor.'

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-xl font-semibold text-text">{isEdit ? 'Edit Associate Details' : 'Register Associate'}</h1>
        <p className="mt-1 text-sm text-text-subtle">
          {isEdit
            ? 'Update the associate’s details, password, sponsor, placement and payment.'
            : 'Fill in the associate’s details and choose their sponsor. Placement and payment are optional.'}
        </p>
      </div>

      <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
        <Section title="Personal Details">
          <FormField label="Title" htmlFor="title" required error={errors.title?.message}>
            <Select id="title" invalid={!!errors.title} {...register('title')}>
              <option value="">Select title</option>
              {ASSOCIATE_TITLES.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Full Name" htmlFor="fullName" required error={errors.fullName?.message}>
            <Input id="fullName" invalid={!!errors.fullName} {...register('fullName')} />
          </FormField>
          <FormField
            label="Father / Husband Name"
            htmlFor="fatherOrHusbandName"
            error={errors.fatherOrHusbandName?.message}
          >
            <Input id="fatherOrHusbandName" invalid={!!errors.fatherOrHusbandName} {...register('fatherOrHusbandName')} />
          </FormField>
          <FormField label="Marital Status" htmlFor="maritalStatus" required error={errors.maritalStatus?.message}>
            <Select id="maritalStatus" invalid={!!errors.maritalStatus} {...register('maritalStatus')}>
              {MARITAL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Gender" htmlFor="gender" required error={errors.gender?.message}>
            <Select id="gender" invalid={!!errors.gender} {...register('gender')}>
              <option value="">Select gender</option>
              {GENDERS.map((gender) => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Date of Birth" htmlFor="dob" error={errors.dob?.message}>
            <Input id="dob" type="date" invalid={!!errors.dob} {...register('dob')} />
          </FormField>
          <FormField label="Age" htmlFor="age" error={errors.age?.message}>
            <Input id="age" inputMode="numeric" invalid={!!errors.age} {...register('age')} />
          </FormField>
        </Section>

        <Section title="Contact & Login">
          <FormField label="Phone" htmlFor="phone" required error={errors.phone?.message}>
            <Input id="phone" inputMode="numeric" invalid={!!errors.phone} {...register('phone')} />
          </FormField>
          <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
            <Input id="email" type="email" invalid={!!errors.email} {...register('email')} />
          </FormField>
          <FormField
            label="Password"
            htmlFor="password"
            required={!isEdit}
            error={errors.password?.message}
            hint={
              isEdit
                ? 'Leave blank to keep the current password. At least 6 characters.'
                : 'At least 6 characters. The associate signs in with this.'
            }
          >
            <PasswordInput id="password" invalid={!!errors.password} {...register('password')} />
          </FormField>
        </Section>

        <Section title="Address">
          <FormField label="Address" htmlFor="address" error={errors.address?.message} className={FULL_ROW}>
            <Textarea id="address" invalid={!!errors.address} {...register('address')} />
          </FormField>
          <FormField label="City" htmlFor="city" error={errors.city?.message}>
            <Input id="city" invalid={!!errors.city} {...register('city')} />
          </FormField>
          <FormField label="State" htmlFor="state" required error={errors.state?.message}>
            <Input id="state" invalid={!!errors.state} {...register('state')} />
          </FormField>
          <FormField label="Country" htmlFor="country" required error={errors.country?.message}>
            <Input id="country" invalid={!!errors.country} {...register('country')} />
          </FormField>
          <FormField label="PIN Code" htmlFor="pinCode" error={errors.pinCode?.message}>
            <Input id="pinCode" inputMode="numeric" invalid={!!errors.pinCode} {...register('pinCode')} />
          </FormField>
        </Section>

        <Section title="Nominee Details">
          <FormField label="Nominee Name" htmlFor="nomineeName" error={errors.nomineeName?.message}>
            <Input id="nomineeName" invalid={!!errors.nomineeName} {...register('nomineeName')} />
          </FormField>
          <FormField label="Relation" htmlFor="nomineeRelation" error={errors.nomineeRelation?.message}>
            <Input id="nomineeRelation" invalid={!!errors.nomineeRelation} {...register('nomineeRelation')} />
          </FormField>
          <FormField label="Nominee Age" htmlFor="nomineeAge" error={errors.nomineeAge?.message}>
            <Input id="nomineeAge" inputMode="numeric" invalid={!!errors.nomineeAge} {...register('nomineeAge')} />
          </FormField>
        </Section>

        <Section title="Membership & Placement">
          <FormField label="Tier" htmlFor="tier" required error={errors.tier?.message}>
            <Select id="tier" invalid={!!errors.tier} {...register('tier')}>
              {ASSOCIATE_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </Select>
          </FormField>

          {isEdit && isRoot ? (
            <FormField label="Sponsor" htmlFor="sponsor-readonly" className="sm:col-span-1 lg:col-span-2">
              <div id="sponsor-readonly" className={READONLY_BOX}>
                None — this associate is the tree root
              </div>
            </FormField>
          ) : (
            <FormField label="Sponsor" htmlFor="sponsorId" hint={sponsorHint} className="sm:col-span-1 lg:col-span-2">
              <input type="hidden" {...register('sponsorId')} />
              <AssociateSelect
                id="sponsorId"
                value={sponsor}
                onChange={changeSponsor}
                role="associate"
                status="approved"
                inTree
                exclude={id}
                placeholder="Search by associate ID or name…"
              />
            </FormField>
          )}

          {/* Edit: who paid — fixed. The sponsor beside it can differ. */}
          {isEdit && !isRoot && (
            <FormField label="Referred by" htmlFor="referred-by-readonly" hint="Who paid — never changes">
              <div id="referred-by-readonly" className={READONLY_BOX}>
                {loadedReferrer?.label ?? loaded?.referredByCode ?? loadedSponsor?.label ?? '—'}
              </div>
            </FormField>
          )}

          {/* Register: the leg is chosen relative to the sponsor. */}
          {!isEdit && sponsor && (
            <OptionalBox
              title="Tree placement"
              description={
                <>
                  Pick a leg to place them under {sponsor.memberCode} now. Leave it empty and {sponsor.fullName} places
                  them from their portal, choosing the parent and leg.
                </>
              }
            >
              <FormField label="Leg" htmlFor="position" error={errors.position?.message}>
                <Select id="position" invalid={!!errors.position} {...register('position')}>
                  <option value="">Let the sponsor place them</option>
                  <option value="Left">Left</option>
                  <option value="Right">Right</option>
                </Select>
              </FormField>

              <div className="flex items-end lg:col-span-2">
                <div className="w-full rounded-control border border-info-border bg-info-bg px-3 py-2 text-sm text-info">
                  {!sponsorLeg ? (
                    'Not placed yet — the sponsor will see them under Place Members.'
                  ) : preview.isFetching ? (
                    <span className="flex items-center gap-2">
                      <Spinner className="h-3.5 w-3.5" /> Working out placement…
                    </span>
                  ) : preview.data ? (
                    preview.data.data.isDirect ? (
                      <>
                        Directly under <span className="font-medium">{sponsor.label}</span>, {sponsorLeg} leg.
                      </>
                    ) : (
                      <>
                        {sponsor.memberCode}’s {sponsorLeg} slot is taken — they spill over to{' '}
                        <span className="font-medium">
                          {preview.data.data.parent.memberCode} — {preview.data.data.parent.fullName}
                        </span>{' '}
                        ({preview.data.data.levelsBelow} levels below).
                      </>
                    )
                  ) : (
                    'Could not preview this placement.'
                  )}
                </div>
              </div>
            </OptionalBox>
          )}

          {/* Edit: any parent, so a placed member can also be moved. */}
          {isEdit && !isRoot && (
            <OptionalBox
              title="Tree placement"
              description={
                isUnplaced ? (
                  <>
                    Not in the tree yet. Pick a leg to place them
                    {sponsor ? ` — under ${sponsor.memberCode} unless you choose another parent` : ''}. Leave the leg
                    empty{sponsor ? ` and ${sponsor.fullName} places them from their portal` : ''}.
                  </>
                ) : (
                  <>
                    Currently under {loadedParent?.label ?? '—'} on the {loaded?.position} leg. Change the parent or leg
                    to move them — spillover applies if that slot is taken.
                  </>
                )
              }
            >
              <FormField label="Place under" htmlFor="parentId" error={errors.parentId?.message}>
                <input type="hidden" {...register('parentId')} />
                <AssociateSelect
                  id="parentId"
                  value={parentOption}
                  onChange={(option) => {
                    setParentOption(option)
                    setValue('parentId', option?._id ?? '', { shouldValidate: true })
                  }}
                  role="associate"
                  inTree
                  exclude={id}
                  placeholder="Search by ID or name…"
                />
              </FormField>

              <FormField label="Leg" htmlFor="position" error={errors.position?.message}>
                <Select id="position" invalid={!!errors.position} {...register('position')}>
                  <option value="">{isUnplaced ? 'Not placed yet' : 'Select leg'}</option>
                  <option value="Left">Left</option>
                  <option value="Right">Right</option>
                </Select>
              </FormField>
            </OptionalBox>
          )}

          {sponsor && !(isEdit && isRoot) && (
            <OptionalBox
              title="Payment received"
              description={
                loaded?.referral ? (
                  <>
                    Recorded on invoice <span className="font-mono">{loaded.referral.invoiceNo}</span>. Changes here update
                    that invoice.
                  </>
                ) : isEdit ? (
                  <>
                    No payment recorded yet. Entering one creates the invoice for {(loadedReferrer ?? sponsor).fullName}.
                  </>
                ) : (
                  <>
                    What {sponsor.fullName} paid for this associate. Everything here can be left empty — the invoice is
                    still created, at ₹0 if no amount is entered.
                  </>
                )
              }
            >
              <PaymentFields register={register} errors={errors} receiverName={receiverName} />
            </OptionalBox>
          )}
        </Section>

        <Section title="Documents">
          <div className={`flex flex-col gap-3 ${FULL_ROW}`}>
            <FormField label="Profile Image" hint="PNG or JPG, shown across the admin panel">
              <label className="flex cursor-pointer items-center gap-3 rounded-control border border-dashed border-border-strong bg-blue-50/40 px-4 py-3 text-sm text-text-muted hover:bg-blue-50">
                <UploadIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">{profileImageFile ? profileImageFile.name : 'Choose a profile image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => setProfileImageFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </FormField>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text">KYC Documents</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addDocumentRow}
                  disabled={documentRows.length >= 5}
                >
                  Add document
                </Button>
              </div>
              {documentRows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-2 rounded-control border border-border p-3 sm:flex-row sm:items-center"
                >
                  <Input
                    className="sm:w-48"
                    placeholder="Document type"
                    value={row.docType}
                    onChange={(event) => updateDocumentRow(row.id, { docType: event.target.value })}
                  />
                  <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-control border border-dashed border-border-strong px-3 py-2 text-sm text-text-muted hover:bg-blue-50">
                    <UploadIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{row.file ? row.file.name : 'Choose file'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(event) => updateDocumentRow(row.id, { file: event.target.files?.[0] ?? null })}
                    />
                  </label>
                  {documentRows.length > 1 && (
                    <IconButton
                      icon={<XIcon className="h-4 w-4" />}
                      label="Remove document"
                      tone="danger"
                      className="self-end sm:self-auto"
                      onClick={() => removeDocumentRow(row.id)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </Section>

        <div className="flex justify-end gap-3 border-t border-border pt-6">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Register associate'}
          </Button>
        </div>
      </form>

      {registered && <RegistrationSuccessModal result={registered} />}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-white p-5 shadow-card">
      <h2 className="mb-4 text-sm font-semibold text-text">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
    </div>
  )
}

/** A full-width sub-panel inside a Section, marked optional. */
function OptionalBox({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
  return (
    <div className={FULL_ROW}>
      <div className="rounded-card border border-border bg-bg p-4">
        <p className="text-sm font-medium text-text">
          {title} <span className="font-normal text-text-subtle">(optional)</span>
        </p>
        <p className="mt-0.5 text-xs text-text-subtle">{description}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      </div>
    </div>
  )
}

function PaymentFields({
  register,
  errors,
  receiverName,
}: {
  register: UseFormRegister<AssociateFormValues>
  errors: FieldErrors<AssociateFormValues>
  /** The admin shown as "Received by" — display only. */
  receiverName: string
}) {
  return (
    <>
      <FormField label="Amount paid (₹)" htmlFor="amountPaid" error={errors.amountPaid?.message}>
        <Input
          id="amountPaid"
          type="number"
          min="0"
          inputMode="decimal"
          placeholder="25000"
          invalid={!!errors.amountPaid}
          {...register('amountPaid')}
        />
      </FormField>
      <FormField label="Payment mode" htmlFor="paymentMode">
        <Select id="paymentMode" {...register('paymentMode')}>
          <option value="">Not recorded</option>
          {PAYMENT_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Reference" htmlFor="paymentRef" hint="UPI txn id, cheque no, bank ref" error={errors.paymentRef?.message}>
        <Input id="paymentRef" invalid={!!errors.paymentRef} {...register('paymentRef')} />
      </FormField>
      <FormField label="Received on" htmlFor="receivedOn">
        <Input id="receivedOn" type="date" {...register('receivedOn')} />
      </FormField>
      <FormField
        label="Received by"
        htmlFor="receivedBy"
        hint="Always the admin recording the payment"
        className="sm:col-span-2"
      >
        <div id="receivedBy" className={READONLY_BOX}>
          {receiverName} (Admin)
        </div>
      </FormField>
      <FormField label="Notes" htmlFor="notes" error={errors.notes?.message} className="sm:col-span-2 lg:col-span-3">
        <Textarea id="notes" rows={2} invalid={!!errors.notes} {...register('notes')} />
      </FormField>
    </>
  )
}
