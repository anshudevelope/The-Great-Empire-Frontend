// import type { ReactNode } from 'react'
// import { useForm } from 'react-hook-form'
// import { zodResolver } from '@hookform/resolvers/zod'
// import { useMutation } from '@tanstack/react-query'
// import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
// import toast from 'react-hot-toast'
// import { loginSchema } from '@/schemas/auth.schema'
// import type { LoginFormValues } from '@/schemas/auth.schema'
// import { login as loginRequest } from '@/api/auth'
// import { ApiRequestError } from '@/api/fetchClient'
// import { useCompanyBrand } from '@/api/company'
// import { useAuthStore } from '@/store/authStore'
// import type { UserRole } from '@/types/auth'
// import { homeFor } from './routes'
// import { Input } from '@/components/ui/Input'
// import { PasswordInput } from '@/components/ui/PasswordInput'
// import { BuildingIcon } from '@/components/icons/icons'
// import { Spinner } from '@/components/ui/Spinner'

// interface LocationState {
//   from?: { pathname: string }
// }

// interface LoginFormProps {
//   /** Which door this is. Only changes branding and the cross-link — never authorisation. */
//   audience: UserRole
//   /** Small pill above the title, e.g. "Staff Access". */
//   badge: string
//   title: string
//   subtitle: string
//   icon: ReactNode
//   /** Link to the other login page. */
//   otherLabel: string
//   otherCta: string
//   otherTo: string
//   userLabel: string
// }

// /**
//  * Shared sign-in screen for both doors.
//  *
//  * Styled to match the marketing site: slate ground, white card, blue-100
//  * hairlines, blue-900 actions — so moving from the landing page into either
//  * login feels like the same product.
//  */
// export function LoginForm({ audience, badge, title, subtitle, icon, otherLabel, otherCta, otherTo, userLabel }: LoginFormProps) {
//   const company = useCompanyBrand()
//   const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
//   const user = useAuthStore((state) => state.user)
//   const setSession = useAuthStore((state) => state.login)
//   const navigate = useNavigate()
//   const location = useLocation()

//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//   } = useForm<LoginFormValues>({
//     resolver: zodResolver(loginSchema),
//     defaultValues: { email: '', password: '' },
//   })

//   const mutation = useMutation({
//     mutationFn: loginRequest,
//     onSuccess: (data) => {
//       setSession(data.token, data.data)

//       const role = data.data.role

//       // Signing in through the "wrong" door is not an error — the credentials
//       // are valid either way. Say where they're going and send them to their
//       // own side, rather than refusing a correct password.
//       if (role !== audience) {
//         toast.success(`Signed in as ${role} — taking you to your ${role === 'admin' ? 'console' : 'portal'}`)
//         navigate(homeFor(role), { replace: true })
//         return
//       }

//       toast.success(`Welcome back, ${data.data.fullName.split(' ')[0]}`)
//       const state = location.state as LocationState | null
//       navigate(state?.from?.pathname ?? homeFor(role), { replace: true })
//     },
//     onError: (error) => {
//       toast.error(error instanceof ApiRequestError ? error.message : 'Login failed. Please try again.')
//     },
//   })

//   if (isAuthenticated && user) {
//     return <Navigate to={homeFor(user.role)} replace />
//   }

//   return (
//     <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-blue-950">
//       {/* Same bar as the marketing site, so the transition is seamless. */}
//       <header className="flex items-center justify-between border-b border-blue-100 bg-white px-6 py-5 sm:px-12">
//         <Link to="/" className="flex items-center gap-3">
//           <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-900 text-white shadow-xs">
//             <BuildingIcon className="h-5 w-5" />
//           </div>
//           <span className="text-lg font-bold tracking-tight text-blue-950">{company.name}</span>
//         </Link>

//         <Link to={otherTo}>
//           <button className="rounded-lg px-4 py-2 text-sm font-medium text-blue-800 transition-colors hover:bg-blue-50">
//             {otherCta}
//           </button>
//         </Link>
//       </header>

//       <main className="flex flex-1 items-center justify-center px-6 py-16">
//         <div className="w-full max-w-md">
//           <div className="mb-8 flex flex-col items-center text-center">
//             <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
//               {icon}
//             </div>
//             <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
//               <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
//               {badge}
//             </div>
//             <h1 className="text-3xl font-bold tracking-tight text-blue-950">{title}</h1>
//             <p className="mt-2 text-sm leading-relaxed text-blue-800/70">{subtitle}</p>
//           </div>

//           <div className="rounded-xl border border-blue-100 bg-white p-8 shadow-xs">
//             <form
//               className="flex flex-col gap-5"
//               onSubmit={handleSubmit((values) => mutation.mutate(values))}
//               noValidate
//             >
//               <div className="flex flex-col gap-1.5">
//                 <label htmlFor="email" className="text-sm font-semibold text-blue-950">
//                   {userLabel}
//                 </label>
//                 <Input
//                   id="email"
//                   type="email"
//                   autoComplete="username"
//                   placeholder="you@example.com"
//                   invalid={!!errors.email}
//                   {...register('email')}
//                 />
//                 {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
//               </div>

//               <div className="flex flex-col gap-1.5">
//                 <label htmlFor="password" className="text-sm font-semibold text-blue-950">
//                   Password
//                 </label>
//                 <PasswordInput
//                   id="password"
//                   autoComplete="current-password"
//                   placeholder="••••••••"
//                   invalid={!!errors.password}
//                   {...register('password')}
//                 />
//                 {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
//               </div>

//               <button
//                 type="submit"
//                 disabled={mutation.isPending}
//                 className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-900 px-7 py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
//               >
//                 {mutation.isPending && <Spinner className="h-4 w-4" />}
//                 Sign in
//               </button>
//             </form>
//           </div>

//           <p className="mt-6 text-center text-sm text-blue-800/70">
//             {otherLabel}{' '}
//             <Link to={otherTo} className="font-semibold text-blue-700 hover:text-blue-800">
//               {otherCta}
//             </Link>
//           </p>
//         </div>
//       </main>

//       <footer className="border-t border-blue-100 bg-white px-6 py-6 text-center text-xs text-blue-700/70 sm:px-10">
//         © {new Date().getFullYear()} {company.name}. All rights reserved.
//       </footer>
//     </div>
//   )
// }


import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { loginSchema } from '@/schemas/auth.schema'
import type { LoginFormValues } from '@/schemas/auth.schema'
import { login as loginRequest } from '@/api/auth'
import { ApiRequestError } from '@/api/fetchClient'
import { useCompanyBrand } from '@/api/company'
import { useAuthStore } from '@/store/authStore'
import { homeFor, useAuthScope, type AuthScope } from '@/store/authScope'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { BuildingIcon } from '@/components/icons/icons'
import { Spinner } from '@/components/ui/Spinner'

interface LocationState {
  from?: { pathname: string }
}

interface LoginFormProps {
  /**
   * Which door this is. Sent to the API as part of the credential check — a
   * valid password for the other role fails here rather than redirecting.
   * Must match the scope of the route this page is mounted on.
   */
  audience: AuthScope
  badge: string
  title: string
  subtitle: string
  icon: ReactNode
  otherLabel: string
  otherCta: string
  otherTo: string
  userLabel?: string
  placeholder?: string
}

export function LoginForm({
  audience,
  badge,
  title,
  subtitle,
  icon,
  otherLabel,
  otherCta,
  otherTo,
  userLabel,
  placeholder = "",
}: LoginFormProps) {
  const company = useCompanyBrand()
  const scope = useAuthScope()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const setSession = useAuthStore((state) => state.login)
  const navigate = useNavigate()
  const location = useLocation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  })

  const mutation = useMutation({
    // The API only returns a session when the role matches the audience, so
    // anything that reaches onSuccess belongs on this side of the app.
    mutationFn: (values: LoginFormValues) => loginRequest({ ...values, audience }),
    onSuccess: (data) => {
      setSession(data.token, data.data)

      toast.success(`Welcome back, ${data.data.fullName.split(' ')[0]}`)
      const state = location.state as LocationState | null
      navigate(state?.from?.pathname ?? homeFor(audience), { replace: true })
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiRequestError ? error.message : 'Login failed. Please try again.'
      )
    },
  })

  // Only this scope's session skips the form, and only to this scope's home.
  // Being signed in as an admin must not redirect anyone away from the
  // associate login — the two sessions are meant to coexist.
  if (isAuthenticated) {
    return <Navigate to={homeFor(scope)} replace />
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-blue-950">
      <header className="flex items-center justify-between border-b border-blue-100 bg-white px-6 py-5 sm:px-12">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-900 text-white shadow-xs">
            <BuildingIcon className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-blue-950">{company.name}</span>
        </Link>

        <Link to={otherTo}>
          <button className="rounded-lg px-4 py-2 text-sm font-medium text-blue-800 transition-colors hover:bg-blue-50">
            {otherCta}
          </button>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              {icon}
            </div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              {badge}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-blue-950">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-blue-800/70">{subtitle}</p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-white p-8 shadow-xs">
            <form
              className="flex flex-col gap-5"
              onSubmit={handleSubmit((values) => mutation.mutate(values))}
              noValidate
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="identifier" className="text-sm font-semibold text-blue-950">
                  {userLabel}
                </label>
                <Input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  placeholder={placeholder}
                  invalid={!!errors.identifier}
                  {...register('identifier')}
                />
                {errors.identifier && (
                  <p className="text-xs text-danger">{errors.identifier.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-semibold text-blue-950">
                  Password
                </label>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  invalid={!!errors.password}
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs text-danger">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-900 px-7 py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {mutation.isPending && <Spinner className="h-4 w-4" />}
                Sign in
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-blue-800/70">
            {otherLabel}{' '}
            <Link to={otherTo} className="font-semibold text-blue-700 hover:text-blue-800">
              {otherCta}
            </Link>
          </p>
        </div>
      </main>

      <footer className="border-t border-blue-100 bg-white px-6 py-6 text-center text-xs text-blue-700/70 sm:px-10">
        © {new Date().getFullYear()} {company.name}. All rights reserved.
      </footer>
    </div>
  )
}