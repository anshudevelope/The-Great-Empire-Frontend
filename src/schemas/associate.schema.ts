import { z } from 'zod'

export const ASSOCIATE_TITLES = ['Mr.', 'Mrs.', 'Ms.', 'Dr.'] as const
export const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'] as const
export const GENDERS = ['Male', 'Female', 'Other'] as const
export const ASSOCIATE_TIERS = ['Tier I', 'Tier II'] as const

function numericStringField(label: string, opts: { min?: number; max?: number } = {}) {
  return z.string().optional().refine((value) => {
    if (!value) return true
    if (!/^\d+$/.test(value)) return false
    const num = Number(value)
    if (opts.min !== undefined && num < opts.min) return false
    if (opts.max !== undefined && num > opts.max) return false
    return true
  }, `Enter a valid ${label}`)
}

const associateBaseShape = {
  title: z.enum(ASSOCIATE_TITLES, { error: 'Select a title' }),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name is too long'),
  fatherOrHusbandName: z.string().max(100, 'Too long').optional(),
  maritalStatus: z.enum(MARITAL_STATUSES, { error: 'Select a marital status' }),
  gender: z.enum(GENDERS, { error: 'Select a gender' }),
  phone: z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit phone number'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  dob: z.string().optional(),
  age: numericStringField('age', { min: 18, max: 120 }),
  address: z.string().max(250, 'Too long').optional(),
  city: z.string().max(100, 'Too long').optional(),
  country: z.string().min(1, 'Country is required'),
  state: z.string().min(1, 'State is required'),
  pinCode: z.string().optional().refine((v) => !v || /^\d{6}$/.test(v), 'Enter a valid 6-digit PIN code'),
  nomineeName: z.string().max(100, 'Too long').optional(),
  nomineeRelation: z.string().max(100, 'Too long').optional(),
  nomineeAge: numericStringField('nominee age', { min: 0, max: 120 }),
  tier: z.enum(ASSOCIATE_TIERS, { error: 'Select a tier' }),
  sponsorId: z.string().optional(),
  position: z.enum(['Left', 'Right', '']).optional(),
}

const associateObjectSchema = z.object({
  ...associateBaseShape,
  password: z.string().optional(),
})

// Both schemas below wrap the same object shape (via superRefine) purely to add a
// mode-dependent password rule, so they share one inferred TS type — that lets
// AssociateFormPage swap the schema at runtime without the resolver type splitting.
// A sponsor without a chosen Left/Right slot saves a parentId but never
// attaches into the tree (the backend only wires the parent's leftChild/
// rightChild pointer when both are present) — so once a sponsor is picked,
// position becomes required to avoid silently orphaning the associate.
function requirePositionWithSponsor(values: { sponsorId?: string; position?: string }, ctx: z.RefinementCtx) {
  if (values.sponsorId && !values.position) {
    ctx.addIssue({ code: 'custom', message: 'Select a tree position for this sponsor', path: ['position'] })
  }
}

export const createAssociateSchema = associateObjectSchema.superRefine((values, ctx) => {
  if (!values.password || values.password.length < 6) {
    ctx.addIssue({ code: 'custom', message: 'Password must be at least 6 characters', path: ['password'] })
  }
  requirePositionWithSponsor(values, ctx)
})

export const editAssociateSchema = associateObjectSchema.superRefine((values, ctx) => {
  if (values.password && values.password.length < 6) {
    ctx.addIssue({ code: 'custom', message: 'Password must be at least 6 characters', path: ['password'] })
  }
  requirePositionWithSponsor(values, ctx)
})

export type AssociateFormValues = z.infer<typeof associateObjectSchema>
