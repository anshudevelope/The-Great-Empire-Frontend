export type AssociateTitle = 'Mr.' | 'Mrs.' | 'Ms.' | 'Dr.'
export type MaritalStatus = 'Single' | 'Married' | 'Divorced' | 'Widowed'
export type Gender = 'Male' | 'Female' | 'Other'
export type AssociateStatus = 'pending' | 'approved' | 'rejected'
export type AssociateTier = 'Tier I' | 'Tier II'
export type AssociatePosition = 'Left' | 'Right' | null

export interface AssociateDocument {
  docType: string
  url: string
  public_id: string
}

export interface ProfileImage {
  url: string
  public_id: string
}

export interface SponsorRef {
  _id: string
  memberCode?: string | null
  fullName: string
  email: string
  phone: string
}

export type TreeStatus = 'unplaced' | 'root' | 'placed'

/** The member's live referral — its payment pre-fills the edit form. Admin responses only. */
export interface AssociateReferral {
  _id: string
  referralNo: string
  invoiceNo: string
  status: 'unused' | 'used' | 'cancelled'
  amountPaid: number
  paymentMode: string | null
  paymentRef: string
  receivedOn: string | null
  receivedBy: SponsorRef | null
  notes: string
}

export interface Associate {
  _id: string
  /** The one associate ID (TGE0001) — also what they are referred to by as a sponsor. Null only for admins. */
  memberCode: string | null
  /**
   * Associate ID of whoever holds the sponsor credit. Starts as the referrer and
   * can be passed to someone in their team while placing. Null for the tree root.
   */
  sponsorMemberCode: string | null
  /** Who referred (paid for) them — fixed at registration. Populated on the admin's single-associate response. */
  referredBy?: SponsorRef | string | null
  /** Associate ID of the referrer. */
  referredByCode?: string | null
  /**
   * Readable password — present on admin responses only. Null when the account
   * predates stored passwords; the admin sets a new one from Edit.
   */
  password?: string | null
  /** Present on the admin's single-associate response; null when no payment is recorded. */
  referral?: AssociateReferral | null
  /** Placement is optional at creation — 'unplaced' means not in the tree yet. */
  treeStatus: TreeStatus
  title: AssociateTitle
  fullName: string
  fatherOrHusbandName: string
  maritalStatus: MaritalStatus
  gender: Gender
  phone: string
  email: string
  dob?: string
  age?: number
  address: string
  city: string
  country: string
  state: string
  pinCode: string
  nomineeName: string
  nomineeRelation: string
  nomineeAge?: number
  role: 'associate' | 'admin'
  status: AssociateStatus
  sponsorId: SponsorRef | string | null
  parentId: SponsorRef | string | null
  position: AssociatePosition
  leftChild: SponsorRef | string | null
  rightChild: SponsorRef | string | null
  tier: AssociateTier
  profileImage: ProfileImage
  documents: AssociateDocument[]
  createdAt: string
  updatedAt: string
}

/**
 * Node shape returned by the tree endpoints. Mirrors `toNode()` on the server.
 * `leftChild`/`rightChild` are the raw pointers — they tell an empty slot apart
 * from a child that exists but sits beyond the requested depth.
 */
/** One leg's figures for a tier: how many members sit under it, and their volume. */
export interface LegBusiness {
  count: number
  amount: number
}

/**
 * Per-tier business for one node, as the genealogy tooltip shows it.
 *
 * `carry` is unmatched volume waiting for a counterpart on the other leg;
 * `left`/`right` are the lifetime totals. Tier II carries real member counts but
 * zero volume — the commission engine only recognises Tier I today.
 */
export interface TierBusiness {
  carry: { left: number; right: number }
  left: LegBusiness
  right: LegBusiness
}

export interface NodeBusiness {
  tierI: TierBusiness
  tierII: TierBusiness
}

/** Commission earned by a member, net of reversals. */
export interface NodeIncome {
  /** 10% direct referral bonus. */
  direct: number
  /** 5% binary matching bonus. */
  matching: number
  total: number
}

export interface AssociateTreeNode {
  _id: string
  memberCode: string
  fullName: string
  email: string
  phone: string
  status: AssociateStatus
  tier: AssociateTier
  position: AssociatePosition
  profileImage: ProfileImage
  /** Member code of whoever sponsored them — the tooltip's "Sponsor PID". */
  sponsorMemberCode: string | null
  treeStatus: TreeStatus
  /** Placement parent's code. Differs from the sponsor whenever spillover applied. */
  parentCode: string | null
  depth: number
  directCount: number
  joinedAt: string
  /** Sponsor ≠ placement parent: spillover moved this member down a leg. */
  isSpillover: boolean
  /** Per-leg carry and volume. Absent on responses from before the commission engine. */
  business?: NodeBusiness
  /** Earned income. Absent on responses from before the commission engine. */
  income?: NodeIncome
  leftChild: string | null
  rightChild: string | null
  left: AssociateTreeNode | null
  right: AssociateTreeNode | null
  hasMoreLeft: boolean
  hasMoreRight: boolean
}
