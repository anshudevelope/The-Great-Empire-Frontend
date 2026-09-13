// import { z } from 'zod'

// export const loginSchema = z.object({
//   email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
//   password: z.string().min(1, 'Password is required'),
// })

// export type LoginFormValues = z.infer<typeof loginSchema>

// export const changePasswordSchema = z
//   .object({
//     currentPassword: z.string().min(1, 'Current password is required'),
//     // Mirrors the server rule; the API re-checks it regardless.
//     newPassword: z.string().min(8, 'New password must be at least 8 characters'),
//     confirmPassword: z.string().min(1, 'Please confirm your new password'),
//   })
//   .refine((values) => values.newPassword === values.confirmPassword, {
//     message: 'Passwords do not match',
//     path: ['confirmPassword'],
//   })
//   .refine((values) => values.newPassword !== values.currentPassword, {
//     message: 'New password must be different from the current one',
//     path: ['newPassword'],
//   })

// export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>


import { z } from 'zod'

// Pattern to match either a valid email OR a non-empty string for Associate ID (e.g. TRG0001)
export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Email or Associate ID is required')
    .refine(
      (val) => {
        const trimmed = val.trim()
        // Accepts either standard email format OR alphanumeric member codes (e.g., TRG0001)
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
        const isMemberCode = /^[A-Za-z0-9_-]+$/.test(trimmed)
        return isEmail || isMemberCode
      },
      { message: 'Enter a valid email address or Associate ID' }
    ),
  password: z.string().min(1, 'Password is required'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: 'New password must be different from the current one',
    path: ['newPassword'],
  })

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>