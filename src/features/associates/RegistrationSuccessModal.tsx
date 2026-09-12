import { useNavigate } from 'react-router-dom'
import type { RegisterAssociateResponse } from '@/api/associates'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { CheckIcon } from '@/components/icons/icons'

/**
 * Shown after a successful registration, in place of an automatic redirect.
 *
 * Every way out leaves the form — closing (Esc / clicking outside) goes to the
 * list — so the filled-in form can't be submitted a second time by accident.
 */
export function RegistrationSuccessModal({ result }: { result: RegisterAssociateResponse }) {
  const navigate = useNavigate()
  const member = result.data
  const referral = result.referral

  const goToList = () => navigate('/admin/associates')

  return (
    <Modal open onClose={goToList} size="md">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success">
          <CheckIcon className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-text">{member.fullName} is registered</h2>
        {result.message && <p className="mt-1 text-sm text-text-subtle">{result.message}</p>}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-card border border-border bg-bg p-4 text-sm">
        <Detail label="Associate ID" value={member.memberCode ?? '—'} mono />
        <Detail label="Sponsor" value={member.sponsorMemberCode ?? 'None — tree root'} mono={!!member.sponsorMemberCode} />
        <Detail label="Tier" value={member.tier} />
        <Detail label="Status" value={member.status === 'approved' ? 'Approved' : 'Pending until placed'} />
        {referral && <Detail label="Invoice" value={referral.invoiceNo} mono />}
        {referral && <Detail label="Referral" value={referral.referralNo} mono />}
      </dl>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={goToList}>
          Go to associate list
        </Button>
        {referral ? (
          <Button onClick={() => navigate(`/admin/invoices/${referral._id}`)}>View invoice</Button>
        ) : (
          // The tree root has no sponsor, so no invoice was raised.
          <Button onClick={() => navigate(`/admin/associates/${member._id}`)}>View associate</Button>
        )}
      </div>
    </Modal>
  )
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-text-subtle">{label}</dt>
      <dd className={mono ? 'mt-0.5 truncate font-mono text-sm text-text' : 'mt-0.5 truncate text-sm text-text'}>{value}</dd>
    </div>
  )
}
