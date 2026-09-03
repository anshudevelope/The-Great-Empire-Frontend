import { Link } from 'react-router-dom'
import { BuildingIcon, CheckIcon, DashboardIcon, UsersIcon } from '@/components/icons/icons'
import { Button } from '@/components/ui/Button'

const FEATURES = [
  { icon: UsersIcon, label: 'Associate onboarding', description: 'Register and verify new associates end to end.' },
  { icon: CheckIcon, label: 'Approval workflows', description: 'Review, approve or reject applications with a click.' },
  { icon: DashboardIcon, label: 'Network visibility', description: 'Track tiers, sponsors and status from one dashboard.' },
]

export function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-blue-950 text-white">
      {/* Signature ambient glow + grid — the one decorative flourish on this page */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-1/2 h-[36rem] w-[36rem] translate-x-1/2 rounded-full bg-blue-500/25 blur-[110px] sm:right-0 sm:translate-x-1/4"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)]"
      />

      <header className="relative flex items-center justify-between px-6 py-6 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
            <BuildingIcon className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">Great Empire</span>
        </div>
        <Link to="/admin/login">
          <Button variant="inverse" size="sm">
            Admin Login
          </Button>
        </Link>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-5 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-blue-200">
          Real Estate Associate Network
        </span>
        <h1 className="max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl">
          Run your associate network with confidence
        </h1>
        <p className="mt-5 max-w-5xl text-base leading-relaxed text-blue-200/90 sm:text-lg">
          Great Empire is the operations home for onboarding associates, reviewing approvals, and tracking growth
          across every tier. all from a single admin console.
        </p>
        <Link to="/admin/login" className="mt-9">
          <Button variant="inverse" size="md" className="px-6">
            Admin Login
          </Button>
        </Link>

        <div className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.label} className="rounded-card border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-blue-200">
                <feature.icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-white">{feature.label}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-blue-200/80">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative border-t border-white/10 px-6 py-6 text-center text-xs text-blue-300/70 sm:px-10">
        © {new Date().getFullYear()} Great Empire. All rights reserved.
      </footer>
    </div>
  )
}
