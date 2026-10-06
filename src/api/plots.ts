import { apiRequest } from './fetchClient'
import { activeAuthStore } from '@/store/authStore'
import { businessHeaders } from '@/store/businessStore'
import type { ApiMessageResponse, ApiSingleResponse } from '@/types/api'

// T2 property management + plot sales + plot commission. Every endpoint is
// admin-only and T2-only on the API.

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5000/api'

export interface Paged<T> {
  success: true
  count: number
  total: number
  page: number
  pages: number
  data: T[]
}

export type RecordStatus = 'active' | 'inactive'
export interface Media {
  url: string
  publicId: string | null
}
interface Ref {
  _id: string
  code: string
  name: string
}

type Params = Record<string, string | undefined>

// ---------------------------------------------------------------------------
// Config — mirrors config/plotConfig.js
// ---------------------------------------------------------------------------
export interface PlotConfig {
  commission: { direct: number; matching: number }
  payout: { adminChargePct: number; tdsPct: number }
  rating: { enabled: boolean; defaultPct: number }
  payment: {
    oneTime: { enabled: boolean }
    emi: { enabled: boolean; tenures: number[]; interest: { enabled: boolean; annualPct: number } }
  }
  facings: string[]
  rateUnits: RateUnit[]
  projectStatuses: ProjectStatus[]
  maxPlotsPerCall: number
}
export const fetchPlotConfig = () => apiRequest<ApiSingleResponse<PlotConfig>>('/property/config')

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------
export interface Company {
  _id: string
  code: string
  name: string
  address: string
  contactNumber: string
  country: string
  state: string
  city: string
  pinCode: string
  logo: Media
  status: RecordStatus
}
export type CompanyInput = Omit<Company, '_id' | 'code' | 'logo'> & { logo: string }

export const fetchCompanies = (params: Params = {}) => apiRequest<Paged<Company>>('/property/companies', { params })
export const createCompany = (body: CompanyInput) =>
  apiRequest<ApiSingleResponse<Company>>('/property/companies', { method: 'POST', body })
export const updateCompany = (id: string, body: CompanyInput) =>
  apiRequest<ApiSingleResponse<Company>>(`/property/companies/${id}`, { method: 'PUT', body })
export const deleteCompany = (id: string) => apiRequest<ApiMessageResponse>(`/property/companies/${id}`, { method: 'DELETE' })

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export type ProjectStatus = 'upcoming' | 'ongoing' | 'completed'
export interface Project {
  _id: string
  code: string
  company: Ref | string
  name: string
  slug: string
  projectStatus: ProjectStatus
  launchDate: string | null
  possessionDate: string | null
  allotmentPct: number
  visible: boolean
  status: RecordStatus
  location: {
    address: string
    city: string
    state: string
    pinCode: string
    mapsUrl: string
    lat: number | null
    lng: number | null
    landmarks: string[]
  }
  marketing: { shortDescription: string; description: string; amenities: string[]; highlights: string[] }
  legal: { reraNumber: string; approvals: { authority: string; number: string }[]; registryDetails: string }
  media: { cover: Media; layoutMap: Media; brochure: Media; gallery: Media[]; videoUrl: string }
}
// What the form sends: media as plain URLs, lists as arrays.
export interface ProjectInput {
  company: string
  name: string
  projectStatus: ProjectStatus
  launchDate: string
  possessionDate: string
  allotmentPct: string
  visible: boolean
  status: RecordStatus
  location: Omit<Project['location'], 'lat' | 'lng'> & { lat: string; lng: string }
  marketing: Project['marketing']
  legal: Project['legal']
  media: { cover: string; layoutMap: string; brochure: string; gallery: string[]; videoUrl: string }
}

export const fetchProjects = (params: Params = {}) => apiRequest<Paged<Project>>('/property/projects', { params })
export const fetchProject = (id: string) => apiRequest<ApiSingleResponse<Project>>(`/property/projects/${id}`)
export const createProject = (body: ProjectInput) =>
  apiRequest<ApiSingleResponse<Project>>('/property/projects', { method: 'POST', body })
export const updateProject = (id: string, body: ProjectInput) =>
  apiRequest<ApiSingleResponse<Project>>(`/property/projects/${id}`, { method: 'PUT', body })
export const deleteProject = (id: string) => apiRequest<ApiMessageResponse>(`/property/projects/${id}`, { method: 'DELETE' })

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------
export type RateUnit = 'per_sqft' | 'per_plot'
export interface PlotCounts {
  total: number
  available: number
  hold: number
  booked: number
}
export interface Block {
  _id: string
  code: string
  project: Ref | string
  name: string
  plotWidth: number
  plotLength: number
  plotSize: number
  rate: number
  rateUnit: RateUnit
  plotCost: number
  plotCount: number
  startSerial: number
  nextSerial: number
  remark: string
  status: RecordStatus
  counts: PlotCounts
}
export interface BlockInput {
  project: string
  name: string
  plotWidth: string
  plotLength: string
  rate: string
  rateUnit: RateUnit
  plotCount: string
  startSerial: string
  remark: string
}

export const fetchBlocks = (params: Params = {}) => apiRequest<Paged<Block>>('/property/blocks', { params })
export const createBlock = (body: BlockInput) =>
  apiRequest<ApiSingleResponse<Block>>('/property/blocks', { method: 'POST', body })
export const updateBlock = (id: string, body: { name: string; remark: string; status: RecordStatus }) =>
  apiRequest<ApiSingleResponse<Block>>(`/property/blocks/${id}`, { method: 'PUT', body })
export const addBlockPlots = (id: string, count: number) =>
  apiRequest<ApiMessageResponse>(`/property/blocks/${id}/plots`, { method: 'POST', body: { count } })
export const deleteBlock = (id: string) => apiRequest<ApiMessageResponse>(`/property/blocks/${id}`, { method: 'DELETE' })

// ---------------------------------------------------------------------------
// Plots
// ---------------------------------------------------------------------------
export type PlotStatus = 'available' | 'hold' | 'booked'
export interface Plot {
  _id: string
  code: string
  name: string
  serial: number
  block: Ref
  project: Ref
  width: number
  length: number
  size: number
  rate: number
  rateUnit: RateUnit
  basePrice: number
  extraPct: number
  extraAmount: number
  totalPrice: number
  facing: string
  remark: string
  status: PlotStatus
  hold: { note: string; at: string | null }
  recordStatus: RecordStatus
  currentBooking: {
    _id: string
    code: string
    bookedOn: string
    client: { code: string; fullName: string; mobile: string } | null
  } | null
}
export interface PlotList extends Paged<Plot> {
  summary: Partial<Record<PlotStatus, number>>
}
export interface PlotUpdate {
  name?: string
  facing?: string
  remark?: string
  recordStatus?: RecordStatus
  width?: number
  length?: number
  rate?: number
  rateUnit?: RateUnit
  extraPct?: number
  extraAmount?: number
}

export const fetchPlots = (params: Params = {}) => apiRequest<PlotList>('/property/plots', { params })
export const fetchPlot = (id: string) => apiRequest<ApiSingleResponse<Plot>>(`/property/plots/${id}`)
export const updatePlot = (id: string, body: PlotUpdate) =>
  apiRequest<ApiSingleResponse<Plot>>(`/property/plots/${id}`, { method: 'PUT', body })
export const holdPlot = (id: string, note: string) =>
  apiRequest<ApiSingleResponse<Plot>>(`/property/plots/${id}/hold`, { method: 'POST', body: { note } })
export const unholdPlot = (id: string) =>
  apiRequest<ApiSingleResponse<Plot>>(`/property/plots/${id}/unhold`, { method: 'POST' })

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
export interface Client {
  _id: string
  code: string
  title: string
  fullName: string
  guardianName: string
  gender: '' | 'Male' | 'Female' | 'Other'
  dob: string | null
  mobile: string
  email: string
  address: string
  city: string
  state: string
  pinCode: string
  idProof: { type: string; number: string; file: Media }
  notes: string
  status: RecordStatus
  createdAt?: string
}
export interface ClientInput {
  title: string
  fullName: string
  guardianName: string
  gender: string
  dob: string
  mobile: string
  email: string
  address: string
  city: string
  state: string
  pinCode: string
  idProof: { type: string; number: string; file: string }
  notes: string
  status: RecordStatus
}
export interface ClientDetail extends Client {
  bookings: (Omit<Booking, 'plot' | 'project'> & { plot: Ref; project: Ref })[]
}

export const fetchClients = (params: Params = {}) => apiRequest<Paged<Client>>('/plot-sales/clients', { params })
export const fetchClient = (id: string) => apiRequest<ApiSingleResponse<ClientDetail>>(`/plot-sales/clients/${id}`)
export const findClientByMobile = (mobile: string) =>
  apiRequest<ApiSingleResponse<Client | null>>(`/plot-sales/clients/by-mobile/${encodeURIComponent(mobile)}`)
export const createClient = (body: ClientInput) =>
  apiRequest<ApiSingleResponse<Client>>('/plot-sales/clients', { method: 'POST', body })
export const updateClient = (id: string, body: ClientInput) =>
  apiRequest<ApiSingleResponse<Client>>(`/plot-sales/clients/${id}`, { method: 'PUT', body })

// ---------------------------------------------------------------------------
// Bookings & payments
// ---------------------------------------------------------------------------
export type PaymentPlan = 'one_time' | 'emi'
export type BookingStatus = 'active' | 'completed' | 'cancelled'
export type InstalmentKind = 'full' | 'down' | 'emi'
export type InstalmentStatus = 'due' | 'paid' | 'cancelled'

export interface Instalment {
  _id: string
  booking: string
  kind: InstalmentKind
  seq: number
  dueDate: string
  dueAmount: number
  status: InstalmentStatus
  overdue?: boolean
  paidAmount: number
  paidOn: string | null
  mode: string | null
  reference: string
  notes: string
  ratingPct: number
  commissionBase: number
  receiptNo: string | null
  receivedByCode: string | null
}

export interface Booking {
  _id: string
  code: string
  plot: Plot | Ref
  project: Ref
  client: Client | { _id: string; code: string; fullName: string; mobile: string }
  associate: { _id: string; memberCode: string; fullName: string; phone?: string; email?: string }
  associateCode: string
  plan: PaymentPlan
  price: number
  downPayment: number
  tenureMonths: number
  emiAmount: number
  bookedOn: string
  status: BookingStatus
  paidTotal: number
  notes: string
  cancel: { at: string | null; reason: string; refundAmount: number; refundMode: string; refundReference: string }
  createdAt: string
}
export interface BookingDetail extends Booking {
  plot: Plot & { block: Ref }
  client: Client
  schedule: Instalment[]
  balance: number
  nextDue: Instalment | null
}

export interface SchedulePreview {
  price: number
  plan: PaymentPlan
  downPayment: number
  tenureMonths: number
  emiAmount: number
  rows: { kind: InstalmentKind; seq: number; dueDate: string; dueAmount: number }[]
}

export interface SellInput {
  plot: string
  client: string
  associate: string
  plan: PaymentPlan
  downPayment?: number
  tenureMonths?: number
  bookedOn: string
  notes?: string
  payNow?: { mode: string; reference: string; paidOn: string; ratingPct: number } | null
}

export const previewSchedule = (params: Params) =>
  apiRequest<ApiSingleResponse<SchedulePreview>>('/plot-sales/bookings/schedule-preview', { params })
export const createBooking = (body: SellInput) =>
  apiRequest<ApiSingleResponse<{ _id: string; code: string; receiptPaymentId: string | null }> & { message: string }>(
    '/plot-sales/bookings',
    { method: 'POST', body },
  )
export const fetchBookings = (params: Params = {}) => apiRequest<Paged<Booking>>('/plot-sales/bookings', { params })
export const fetchBooking = (id: string) => apiRequest<ApiSingleResponse<BookingDetail>>(`/plot-sales/bookings/${id}`)
export const cancelBooking = (
  id: string,
  body: { reason: string; refundAmount: number; refundMode: string; refundReference: string },
) => apiRequest<ApiSingleResponse<{ reversed: number }> & { message: string }>(`/plot-sales/bookings/${id}/cancel`, { method: 'POST', body })

export interface ReceiveInput {
  amount: number
  paidOn: string
  mode: string
  reference: string
  notes: string
  ratingPct: number
}
export const receivePayment = (id: string, body: ReceiveInput) =>
  apiRequest<ApiSingleResponse<Instalment> & { message: string }>(`/plot-sales/payments/${id}/receive`, {
    method: 'POST',
    body,
  })

export interface PaymentRow extends Omit<Instalment, 'booking'> {
  booking: { _id: string; code: string; plan: PaymentPlan; status: BookingStatus }
  plot: Ref
  project: Ref
  client: { _id: string; code: string; fullName: string; mobile: string }
  associate: { _id: string; memberCode: string; fullName: string }
}
export interface PaymentList extends Paged<PaymentRow> {
  summary: { paid: number; due: number }
}
export interface DueList extends Paged<PaymentRow> {
  summary: { due: number; overdue: number; overdueCount: number }
}
export const fetchPayments = (params: Params = {}) => apiRequest<PaymentList>('/plot-sales/payments', { params })
export const fetchDues = (params: Params = {}) => apiRequest<DueList>('/plot-sales/payments/dues', { params })

export interface Receipt extends Omit<PaymentRow, 'project' | 'client' | 'plot' | 'booking'> {
  booking: { _id: string; code: string; plan: PaymentPlan; price: number; paidTotal: number; tenureMonths: number; bookedOn: string; status: BookingStatus }
  plot: { code: string; name: string; size: number; facing: string; block: { name: string } }
  project: { code: string; name: string; location: Project['location']; company: Company }
  client: Client
  totalInstalments: number
  balance: number
}
export const fetchReceipt = (id: string) => apiRequest<ApiSingleResponse<Receipt>>(`/plot-sales/payments/${id}/receipt`)

/** Payment history as CSV, with the same filters as the screen. */
export async function downloadPaymentsCsv(params: Params = {}): Promise<void> {
  const token = activeAuthStore().getState().token
  const url = new URL(`${BASE_URL.replace(/\/$/, '')}/plot-sales/payments`)
  url.searchParams.set('format', 'csv')
  for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value)

  const response = await fetch(url.toString(), {
    headers: { ...businessHeaders(), ...(token ? { Authorization: token } : {}) },
  })
  if (!response.ok) throw new Error('Export failed')

  const objectUrl = URL.createObjectURL(await response.blob())
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = `plot-payments-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

// ---------------------------------------------------------------------------
// Plot commission & payouts
// ---------------------------------------------------------------------------
export type CommissionType = 'direct' | 'matching' | 'reversal'
export interface CommissionRow {
  _id: string
  beneficiaryCode: string
  type: CommissionType
  amount: number
  sourceAssociateCode: string
  bookingCode: string
  booking: string
  basis: { rate: number; base: number; rating: number | null; legSide: string | null; depthFromSource: number | null }
  payout: { _id: string; payoutNo: string; status: string } | null
  note: string
  createdAt: string
}
export interface CommissionLedger extends Paged<CommissionRow> {
  summary: { total: number; unpaid: number }
}
export interface CommissionSummaryRow {
  associate: string
  memberCode: string
  fullName: string
  carry: { left: number; right: number }
  volume: { left: number; right: number }
  earned: { direct: number; matching: number }
  unpaid: number
  paid: number
}
/** One associate's plot position — the tree hover card's "Plots" rows. */
export interface PlotNodeSummary {
  carry: { left: number; right: number }
  volume: { left: number; right: number }
  ratedVolume: { left: number; right: number }
  /** Live plot sales credited to anyone in each leg. */
  sales: { left: number; right: number }
  earned: { direct: number; matching: number }
  unpaid: number
  paid: number
}
export const fetchPlotNodeSummary = (associateId: string) =>
  apiRequest<ApiSingleResponse<PlotNodeSummary>>(`/plot-commission/summary/${associateId}`)

export const fetchPlotLedger =(params: Params = {}) => apiRequest<CommissionLedger>('/plot-commission/ledger', { params })
export const fetchPlotSummary = (params: Params = {}) =>
  apiRequest<Paged<CommissionSummaryRow>>('/plot-commission/summary', { params })

export type PayoutStatus = 'draft' | 'finalized' | 'cancelled'
export interface PlotPayoutLine {
  member: string
  memberCode: string
  fullName: string
  direct: number
  matching: number
  reversals: number
  total: number
  adminCharge: number
  tds: number
  netPayable: number
  rowCount: number
}
export interface PlotPayout {
  _id: string
  payoutNo: string
  status: PayoutStatus
  periodEnd: string
  rates: { adminChargePct: number; tdsPct: number }
  lines?: PlotPayoutLine[]
  totals: {
    members: number
    direct: number
    matching: number
    reversals: number
    gross: number
    adminCharge: number
    tds: number
    netPayable: number
  }
  note: string
  finalizedAt: string | null
  cancelledAt: string | null
  cancelReason: string
  createdAt: string
}
export const fetchPlotPayouts = (params: Params = {}) => apiRequest<Paged<PlotPayout>>('/plot-commission/payouts', { params })
export const fetchPlotPayout = (id: string) => apiRequest<ApiSingleResponse<PlotPayout>>(`/plot-commission/payouts/${id}`)
export const generatePlotPayout = (body: { periodEnd: string; note: string }) =>
  apiRequest<ApiSingleResponse<PlotPayout> & { message: string }>('/plot-commission/payouts', { method: 'POST', body })
export const finalizePlotPayout = (id: string) =>
  apiRequest<ApiSingleResponse<PlotPayout> & { message: string }>(`/plot-commission/payouts/${id}/finalize`, { method: 'POST' })
export const cancelPlotPayout = (id: string, reason: string) =>
  apiRequest<ApiSingleResponse<PlotPayout> & { message: string }>(`/plot-commission/payouts/${id}/cancel`, {
    method: 'POST',
    body: { reason },
  })
export const discardPlotPayout = (id: string) =>
  apiRequest<ApiMessageResponse>(`/plot-commission/payouts/${id}`, { method: 'DELETE' })
