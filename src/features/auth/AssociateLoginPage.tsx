import { LoginForm } from './LoginForm'
import { UsersIcon } from '@/components/icons/icons'

/**
 * Member entrance — where associates manage their network and referrals.
 *
 * The public door, and the only one linked from anywhere. There is
 * deliberately no cross-link to the admin console: that URL is handed out
 * privately rather than advertised to every visitor.
 */
export function AssociateLoginPage() {
  return (
    <LoginForm
      audience="associate"
      badge="Member Access"
      title="Associate Portal"
      subtitle="Track your network, referrals and placements."
      icon={<UsersIcon className="h-6 w-6" />}
      userLabel="Associate ID/Email"
      placeholder="TRG0001 or name@example.com"
    />
  )
}
