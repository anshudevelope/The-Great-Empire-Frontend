import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { loginSchema } from '@/schemas/auth.schema'
import type { LoginFormValues } from '@/schemas/auth.schema'
import { login as loginRequest } from '@/api/auth'
import { ApiRequestError } from '@/api/fetchClient'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { FormField } from '@/components/ui/FormField'
import { BuildingIcon } from '@/components/icons/icons'

interface LocationState {
  from?: { pathname: string }
}

const homeFor = (role: string) => (role === 'admin' ? '/admin/dashboard' : '/portal/dashboard')

export function LoginPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const setSession = useAuthStore((state) => state.login)
  const navigate = useNavigate()
  const location = useLocation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const mutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      setSession(data.token, data.data, data.mustChangePassword)

      // A temporary password blocks every other route, so go straight to the
      // reset screen rather than bouncing off a 428 on the dashboard.
      if (data.mustChangePassword) {
        toast('Please set a new password to continue', { icon: '🔒' })
        navigate('/change-password', { replace: true })
        return
      }

      toast.success(`Welcome back, ${data.data.fullName.split(' ')[0]}`)
      const state = location.state as LocationState | null
      navigate(state?.from?.pathname ?? homeFor(data.data.role), { replace: true })
    },
    onError: (error) => {
      toast.error(error instanceof ApiRequestError ? error.message : 'Login failed. Please try again.')
    },
  })

  if (isAuthenticated && user) {
    return <Navigate to={homeFor(user.role)} replace />
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-112 w-md -translate-x-1/2 rounded-full bg-blue-200/50 blur-[100px]"
      />
      <div className="relative w-full max-w-sm rounded-card border border-border bg-white p-8 shadow-popover">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-blue-800 text-white shadow-xs">
            <BuildingIcon className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold text-text">Sign in</h1>
          <p className="mt-1 text-sm text-text-subtle">Great Empire — admins and associates</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
              invalid={!!errors.email}
              {...register('email')}
            />
          </FormField>
          <FormField label="Password" htmlFor="password" required error={errors.password?.message}>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              placeholder="••••••••"
              invalid={!!errors.password}
              {...register('password')}
            />
          </FormField>
          <Button type="submit" className="mt-2 w-full" isLoading={mutation.isPending}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  )
}
