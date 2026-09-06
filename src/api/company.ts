import { useQuery } from '@tanstack/react-query'
import { apiRequest } from './fetchClient'
import type { ApiSingleResponse } from '@/types/api'

/** Public branding — safe to read before sign-in. */
export interface CompanyBrand {
  name: string
  legalName: string
  tagline: string
  website: string
}

export function fetchCompanyBrand(): Promise<ApiSingleResponse<CompanyBrand>> {
  return apiRequest<ApiSingleResponse<CompanyBrand>>('/company')
}

/**
 * Brand details for any surface in the app.
 *
 * Backed by the server's data/company.json, so changing that one file renames
 * the product everywhere. Falls back to a sensible default while loading or if
 * the API is unreachable — a login screen must still render.
 */
export function useCompanyBrand(): CompanyBrand {
  const { data } = useQuery({
    queryKey: ['company-brand'],
    queryFn: fetchCompanyBrand,
    staleTime: 60 * 60 * 1000, // rarely changes; don't refetch on every mount
    retry: false,
  })

  return (
    data?.data ?? {
      name: 'The Great Empire',
      legalName: '',
      tagline: '',
      website: '',
    }
  )
}
