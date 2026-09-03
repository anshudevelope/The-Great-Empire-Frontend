import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ASSOCIATE_TIERS,
  ASSOCIATE_TITLES,
  GENDERS,
  MARITAL_STATUSES,
  createAssociateSchema,
  editAssociateSchema,
} from '@/schemas/associate.schema'
import type { AssociateFormValues } from '@/schemas/associate.schema'
import { useAssociate, useAssociates, useCreateAssociate, useUpdateAssociate } from './hooks'
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
}

interface DocumentRow {
  id: string
  docType: string
  file: File | null
}

function createDocumentRow(): DocumentRow {
  return { id: crypto.randomUUID(), docType: 'KYC Document', file: null }
}

export function AssociateFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()

  const associateQuery = useAssociate(id)
  const sponsorsQuery = useAssociates({ status: 'approved' })
  const createMutation = useCreateAssociate()
  const updateMutation = useUpdateAssociate(id ?? '')

  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [documentRows, setDocumentRows] = useState<DocumentRow[]>([createDocumentRow()])

  const schema = isEdit ? editAssociateSchema : createAssociateSchema

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssociateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyDefaults,
  })

  useEffect(() => {
    if (!isEdit || !associateQuery.data) return
    const associate = associateQuery.data.data
    reset({
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
      sponsorId: typeof associate.sponsorId === 'string' ? associate.sponsorId : (associate.sponsorId?._id ?? ''),
      parentId: typeof associate.parentId === 'string' ? associate.parentId : (associate.parentId?._id ?? ''),
      position: associate.position ?? '',
    })
  }, [isEdit, associateQuery.data, reset])

  const sponsorOptions = useMemo(() => {
    const list = sponsorsQuery.data?.data ?? []
    if (isEdit && id) return list.filter((sponsor) => sponsor._id !== id)
    return list
  }, [sponsorsQuery.data, isEdit, id])

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
      sponsorId: values.sponsorId || undefined,
      parentId: values.parentId || undefined,
      position: values.position || undefined,
    }

    for (const [key, value] of Object.entries(fields)) {
      if (value) formData.append(key, value)
    }

    if (values.password) {
      formData.append('password', values.password)
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
        onSuccess: (response) => navigate(`/admin/associates/${response.data._id}`),
      })
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  if (isEdit && associateQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6 text-blue-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-10">
      <div>
        <h1 className="text-xl font-semibold text-text">{isEdit ? 'Edit Associate Details' : 'Register Associate'}</h1>
        <p className="mt-1 text-sm text-text-subtle">
          {isEdit
            ? 'Update associate profile, documents and nominee details.'
            : 'Create a new associate record pending admin approval.'}
        </p>
      </div>

      <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)} noValidate>
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

        <Section title="Contact Details">
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
            hint={isEdit ? 'Leave blank to keep the current password' : undefined}
          >
            <PasswordInput id="password" invalid={!!errors.password} {...register('password')} />
          </FormField>
        </Section>

        <Section title="Address">
          <FormField label="Address" htmlFor="address" error={errors.address?.message} className="sm:col-span-2">
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

        <Section title="Membership">
          <FormField label="Tier" htmlFor="tier" required error={errors.tier?.message}>
            <Select id="tier" invalid={!!errors.tier} {...register('tier')}>
              {ASSOCIATE_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Sponsor" htmlFor="sponsorId" hint="Optional — pick an existing approved associate">
            <Select id="sponsorId" {...register('sponsorId')}>
              <option value="">No sponsor</option>
              {sponsorOptions.map((sponsor) => (
                <option key={sponsor._id} value={sponsor._id}>
                  {sponsor.fullName} — {sponsor.phone}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Place Under (Binary Tree)"
            htmlFor="parentId"
            hint="Optional — sets the tree parent node; falls back to spillover if the slot is taken"
          >
            <Select id="parentId" {...register('parentId')}>
              <option value="">No tree placement</option>
              {sponsorOptions.map((sponsor) => (
                <option key={sponsor._id} value={sponsor._id}>
                  {sponsor.fullName} — {sponsor.phone}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Position" htmlFor="position" hint="Left or Right leg under the selected parent">
            <Select id="position" {...register('position')}>
              <option value="">Select position</option>
              <option value="Left">Left</option>
              <option value="Right">Right</option>
            </Select>
          </FormField>
        </Section>

        <Section title="Documents">
          <div className="flex flex-col gap-3 sm:col-span-2">
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
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-white p-5 shadow-card">
      <h2 className="mb-4 text-sm font-semibold text-text">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}
