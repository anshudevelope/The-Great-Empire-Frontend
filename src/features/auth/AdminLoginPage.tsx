import { LoginForm } from './LoginForm'
import { ShieldIcon } from '@/components/icons/icons'

/**
 * Staff entrance, reached by direct link only — nothing in the app points
 * here. An associate's credentials are refused outright rather than
 * redirected; this door admits admins and no one else.
 */
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
