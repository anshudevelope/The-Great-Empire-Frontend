import { apiRequest } from './fetchClient'
import { useAuthStore } from '@/store/authStore'
import type { ApiSingleResponse } from '@/types/api'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5000/api'

/** Full letterhead, from the server's data/company.json. */
export interface CompanyDetails {
  name: string
  legalName: string
  tagline: string
  address: string
  city: string
  state: string
  pinCode: string
  country: string
  phone: string
  altPhone: string
  email: string
  website: string
  gstin: string
  pan: string
  cin: string
  rera: string
  bank: { name: string; accountName: string; accountNumber: string; ifsc: string; branch: string }
  invoice: { footerNote: string; terms: string }
}

export interface InvoiceItem {
  description: string
  reference: string
  quantity: number
  unitPrice: number
  amount: number
}

export interface Invoice {
  _id: string
  invoiceNo: string
  invoiceDate: string
  status: 'Paid' | 'Cancelled'
  company: CompanyDetails
  billedTo: {
    memberCode: string | null
    name: string
    email: string
    phone: string
    address: string
  }
  transaction: {
    type: string
    referenceNo: string
    issuedAt: string
    resultedIn: { memberCode: string; name: string | null; at: string | null } | null
  }
  items: InvoiceItem[]
  totals: { subtotal: number; total: number; amountPaid: number; balance: number }
  payment: {
    mode: string | null
    reference: string
    receivedOn: string
    receivedBy: string | null
  }
  cancelledAt: string | null
  cancelReason: string
  notes: string
}

export interface InvoiceListResponse {
  success: true
  count: number
  total: number
  page: number
  pages: number
  summary: { billed: number; cancelled: number; collected: number }
  data: Invoice[]
}

export type InvoiceFilters = Record<string, string | undefined>

export function fetchInvoices(filters: InvoiceFilters = {}): Promise<InvoiceListResponse> {
  return apiRequest<InvoiceListResponse>('/invoices', { params: filters })
}

export function fetchInvoice(id: string): Promise<ApiSingleResponse<Invoice>> {
  return apiRequest<ApiSingleResponse<Invoice>>(`/invoices/${id}`)
}

/** CSV of the invoice register — for handing to an accountant. */
export async function downloadInvoicesCsv(filters: InvoiceFilters = {}): Promise<void> {
  const token = useAuthStore.getState().token
  const url = new URL(`${BASE_URL.replace(/\/$/, '')}/invoices`)
  url.searchParams.set('format', 'csv')
  for (const [key, value] of Object.entries(filters)) {
    if (value) url.searchParams.set(key, value)
  }

  const response = await fetch(url.toString(), { headers: token ? { Authorization: token } : {} })
  if (!response.ok) throw new Error('Export failed')

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
