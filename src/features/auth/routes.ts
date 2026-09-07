import type { UserRole } from '@/types/auth'

/**
 * Where each role belongs.
 *
 * Kept out of the component files so Fast Refresh keeps working — a module that
 * exports both components and plain values loses its refresh boundary.
 */
export const homeFor = (role: UserRole | string) => (role === 'admin' ? '/admin/dashboard' : '/portal/dashboard')

export const loginPathFor = (role: UserRole | string) => (role === 'admin' ? '/admin/login' : '/associate/login')
