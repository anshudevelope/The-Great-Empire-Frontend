import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { loginSchema } from '@/schemas/auth.schema'
import type { LoginFormValues } from '@/schemas/auth.schema'
import { adminLogin } from '@/api/auth'
import { ApiRequestError } from '@/api/fetchClient'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { BuildingIcon } from '@/components/icons/icons'

interface LocationState {
  from?: { pathname: string }
}

export function LoginPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const login = useAuthStore((state) => state.login)
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
    mutationFn: adminLogin,
    onSuccess: (data, variables) => {
      login(data.token, variables.email)
      toast.success('Welcome back')
      const state = location.state as LocationState | null
      navigate(state?.from?.pathname ?? '/admin/dashboard', { replace: true })
    },
    onError: (error) => {
      toast.error(error instanceof ApiRequestError ? error.message : 'Login failed. Please try again.')
    },
  })

  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-sm rounded-card bg-white p-8 shadow-popover">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-navy-900 text-white">
            <BuildingIcon className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold text-text">Admin sign in</h1>
          <p className="mt-1 text-sm text-text-subtle">Great Empire management console</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="admin@example.com"
              invalid={!!errors.email}
              {...register('email')}
            />
          </FormField>
          <FormField label="Password" htmlFor="password" required error={errors.password?.message}>
            <Input
              id="password"
              type="password"
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
