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
  fullName: string
  email: string
  phone: string
}

export interface Associate {
  _id: string
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

export interface AssociateTreeNode {
  _id: string
  fullName: string
  email: string
  phone: string
  role: 'associate' | 'admin'
  status: AssociateStatus
  position: AssociatePosition
  profileImage: ProfileImage
  leftChild: string | null
  rightChild: string | null
  sponsorId: string | null
  left: AssociateTreeNode | null
  right: AssociateTreeNode | null
}
