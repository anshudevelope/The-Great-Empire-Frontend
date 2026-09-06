import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { changePasswordSchema } from '@/schemas/auth.schema'
import type { ChangePasswordFormValues } from '@/schemas/auth.schema'
import { changePassword } from '@/api/auth'
import { ApiRequestError } from '@/api/fetchClient'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { FormField } from '@/components/ui/FormField'
import { BuildingIcon } from '@/components/icons/icons'

/**
 * Reached in two ways:
 *  - forced, when the account still holds a temporary password (the API answers
 *    428 everywhere else until it is replaced)
 *  - voluntarily, from the profile menu
 *
 * Every member registered through a referral lands here on first login, because
 * their sponsor was handed the initial password.
 */
export function ChangePasswordPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const forced = useAuthStore((state) => state.mustChangePassword)
  const updateToken = useAuthStore((state) => state.updateToken)
  const setMustChangePassword = useAuthStore((state) => state.setMustChangePassword)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: ChangePasswordFormValues) =>
      changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
    onSuccess: (data) => {
      // The API re-issues a token for the cleared state; swapping it in avoids
      // an immediate 428 on the next request.
      updateToken(data.token)
      setMustChangePassword(false)
      toast.success('Password updated')
      navigate(user?.role === 'admin' ? '/admin/dashboard' : '/portal/dashboard', { replace: true })
    },
    onError: (error) => {
      toast.error(error instanceof ApiRequestError ? error.message : 'Could not update password.')
    },
  })

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-white p-8 shadow-popover">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-blue-800 text-white shadow-xs">
            <BuildingIcon className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold text-text">
            {forced ? 'Set a new password' : 'Change password'}
          </h1>
          <p className="mt-1 text-sm text-text-subtle">
            {forced
              ? 'Your account is using a temporary password. Choose your own to continue.'
              : 'Pick a new password for your account.'}
          </p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <FormField
            label={forced ? 'Temporary password' : 'Current password'}
            htmlFor="currentPassword"
            required
            error={errors.currentPassword?.message}
          >
            <PasswordInput
              id="currentPassword"
              autoComplete="current-password"
              invalid={!!errors.currentPassword}
              {...register('currentPassword')}
            />
          </FormField>
          <FormField
            label="New password"
            htmlFor="newPassword"
            required
            hint="At least 8 characters"
            error={errors.newPassword?.message}
          >
            <PasswordInput
              id="newPassword"
              autoComplete="new-password"
              invalid={!!errors.newPassword}
              {...register('newPassword')}
            />
          </FormField>
          <FormField label="Confirm new password" htmlFor="confirmPassword" required error={errors.confirmPassword?.message}>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
          </FormField>
          <Button type="submit" className="mt-2 w-full" isLoading={mutation.isPending}>
            Update password
          </Button>
        </form>
      </div>
    </div>
  )
}
