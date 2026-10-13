import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchCompanies, fetchPlotConfig, fetchPlotNodeSummary, fetchProjects, fetchBlocks } from '@/api/plots'

// Lookups many plot screens share. Cached under stable keys so moving between
// screens doesn't refetch them.

/**
 * One associate's plot position, for the tree hover card. Shared between the
 * hook and the hover-time prefetch so both land in the same cache entry.
 */
export const plotNodeSummaryQuery = (associateId: string) =>
  queryOptions({
    queryKey: ['plot-commission', 'node', associateId],
    queryFn: () => fetchPlotNodeSummary(associateId),
    staleTime: 60_000,
    select: (r) => r.data,
  })

export const plotConfigQuery = queryOptions({
  queryKey: ['plot-config'],
  queryFn: fetchPlotConfig,
  staleTime: 5 * 60_000,
  select: (r) => r.data,
})

export function usePlotNodeSummary(associateId: string, enabled: boolean) {
  return useQuery({ ...plotNodeSummaryQuery(associateId), enabled })
}

/** `enabled` lets shared screens (the tree) skip it outside the T2 console, where the API refuses it. */
export function usePlotConfig(enabled = true) {
  return useQuery({ ...plotConfigQuery, enabled })
}

/** Every company, for selects. */
export function useCompanyOptions() {
  return useQuery({
    queryKey: ['plot-companies', 'options'],
    queryFn: () => fetchCompanies({ limit: '100' }),
    select: (r) => r.data,
  })
}

/** Every project (optionally of one company), for selects. */
export function useProjectOptions(company?: string) {
  return useQuery({
    queryKey: ['plot-projects', 'options', company ?? ''],
    queryFn: () => fetchProjects({ limit: '100', company }),
    select: (r) => r.data,
  })
}

/** Blocks of one project, for selects. Disabled until a project is chosen. */
export function useBlockOptions(project?: string) {
  return useQuery({
    queryKey: ['plot-blocks', 'options', project ?? ''],
    queryFn: () => fetchBlocks({ limit: '100', project }),
    select: (r) => r.data,
    enabled: !!project,
  })
}
