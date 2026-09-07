import { LoginForm } from './LoginForm'
import { UsersIcon } from '@/components/icons/icons'

/** Member entrance — where associates manage their network and referrals. */
export function AssociateLoginPage() {
  return (
    <LoginForm
      audience="associate"
      badge="Member Access"
      title="Associate Portal"
      subtitle="Track your network, referrals and placements."
      icon={<UsersIcon className="h-6 w-6" />}
      otherLabel="Are you an administrator?"
      otherCta="Admin Login"
      otherTo="/admin/login"
    />
  )
}
