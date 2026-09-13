import { LoginForm } from './LoginForm'
import { ShieldIcon } from '@/components/icons/icons'

/** Staff entrance. Signing in here as an associate still works — it just
 *  redirects to the portal rather than refusing a valid password. */
export function AdminLoginPage() {
  return (
    <LoginForm
      audience="admin"
      badge="Staff Access"
      title="Admin Console"
      subtitle="Manage associates, referrals and network oversight."
      icon={<ShieldIcon className="h-6 w-6" />}
      otherLabel="Are you an associate?"
      otherCta="Associate Portal"
      otherTo="/associate/login"
      userLabel="Admin Email"
      placeholder="name@example.com"
    />
  )
}
