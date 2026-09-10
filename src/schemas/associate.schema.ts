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

  // Create: the sponsor they're registered under. `position` is then the
  // optional leg under that sponsor.
  sponsorId: z.string().optional(),
  // Edit: re-placement — a parent plus a leg.
  parentId: z.string().optional(),
  position: z.enum(['Left', 'Right', '']).optional(),

  // What the sponsor paid. Only sent when a sponsor is chosen.
  amountPaid: z.string().optional(),
  paymentMode: z.string().optional(),
  paymentRef: z.string().max(100, 'Too long').optional(),
  receivedOn: z.string().optional(),
  receivedBy: z.string().optional(),
  notes: z.string().max(500, 'Too long').optional(),
}

const associateObjectSchema = z.object({
  ...associateBaseShape,
  password: z.string().optional(),
})

// Both schemas below wrap the same object shape (via superRefine) purely to add
// mode-dependent rules, so they share one inferred TS type — that lets
// AssociateFormPage swap the schema at runtime without the resolver type splitting.

// Payment is optional (an empty amount is recorded as ₹0), but a typed amount must be valid.
function validAmount(values: { sponsorId?: string; amountPaid?: string }, ctx: z.RefinementCtx) {
  if (values.sponsorId && values.amountPaid && !/^\d+(\.\d{1,2})?$/.test(values.amountPaid)) {
    ctx.addIssue({ code: 'custom', message: 'Enter a valid amount', path: ['amountPaid'] })
  }
}

export const createAssociateSchema = associateObjectSchema.superRefine((values, ctx) => {
  if (!values.password || values.password.length < 6) {
    ctx.addIssue({ code: 'custom', message: 'Password must be at least 6 characters', path: ['password'] })
  }
  validAmount(values, ctx)
})

export const editAssociateSchema = associateObjectSchema.superRefine((values, ctx) => {
  if (values.password && values.password.length < 6) {
    ctx.addIssue({ code: 'custom', message: 'Password must be at least 6 characters', path: ['password'] })
  }
  // Placement is optional, but a leg means nothing without a parent to hang it on.
  if (values.position && !values.parentId) {
    ctx.addIssue({ code: 'custom', message: 'Choose who to place them under', path: ['parentId'] })
  }
  validAmount(values, ctx)
})

export type AssociateFormValues = z.infer<typeof associateObjectSchema>
