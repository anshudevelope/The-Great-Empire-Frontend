import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { changePasswordSchema } from '@/schemas/auth.schema'
import type { ChangePasswordFormValues } from '@/schemas/auth.schema'
import { changePassword } from '@/api/auth'
import { ApiRequestError } from '@/api/fetchClient'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { FormField } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'

/**
 * Change your own password without leaving the page. Closable any time
 * (Cancel, ✕, Esc, or clicking outside) — nothing changes until Update.
 *
 * Mount it only while open, so each opening starts with an empty form.
 */
export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const updateToken = useAuthStore((state) => state.updateToken)

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
      // The API re-issues the token; swap it in so the session carries on.
      updateToken(data.token)
      toast.success('Password updated')
      onClose()
    },
    onError: (error) => {
      toast.error(error instanceof ApiRequestError ? error.message : 'Could not update password.')
    },
  })

  return (
    <Modal open onClose={onClose} title="Change password" size="sm">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
        <FormField label="Current password" htmlFor="currentPassword" required error={errors.currentPassword?.message}>
          <PasswordInput
            id="currentPassword"
            autoComplete="current-password"
            autoFocus
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

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Update password
          </Button>
        </div>
      </form>
    </Modal>
  )
}
