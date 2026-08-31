import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  createAssociate,
  deleteAssociate,
  fetchAssociateById,
  fetchAssociates,
  updateAssociate,
  updateAssociateStatus,
} from '@/api/associates'
import type { AssociateFilters } from '@/api/associates'
import { ApiRequestError } from '@/api/fetchClient'
import type { AssociateStatus } from '@/types/associate'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback
}

export function useAssociates(filters: AssociateFilters) {
  return useQuery({
    queryKey: ['associates', filters],
    queryFn: () => fetchAssociates(filters),
  })
}

export function useAssociate(id: string | undefined) {
  return useQuery({
    queryKey: ['associate', id],
    queryFn: () => fetchAssociateById(id as string),
    enabled: !!id,
  })
}

export function useCreateAssociate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => createAssociate(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associates'] })
      toast.success('Associate registered successfully')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not register associate')),
  })
}

export function useUpdateAssociate(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => updateAssociate(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associates'] })
      queryClient.invalidateQueries({ queryKey: ['associate', id] })
      toast.success('Associate updated successfully')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update associate')),
  })
}

export function useUpdateAssociateStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AssociateStatus }) => updateAssociateStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['associates'] })
      queryClient.invalidateQueries({ queryKey: ['associate', variables.id] })
      toast.success(`Associate marked as ${variables.status}`)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update status')),
  })
}

export function useDeleteAssociate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAssociate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associates'] })
      toast.success('Associate deleted')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete associate')),
  })
}
