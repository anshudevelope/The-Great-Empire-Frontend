import { Link } from 'react-router-dom'
import { BuildingIcon } from '@/components/icons/icons'
import { Button } from '@/components/ui/Button'

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-navy-950 text-white">
      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
        <div className="flex items-center gap-2">
          <BuildingIcon className="h-6 w-6 text-navy-200" />
          <span className="text-base font-semibold tracking-tight">Great Empire</span>
        </div>
        <Link to="/admin/login">
          <Button variant="inverse" size="sm">
            Admin Login
          </Button>
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="mb-4 inline-flex items-center rounded-full border border-navy-700 bg-navy-900 px-3 py-1 text-xs font-medium uppercase tracking-wide text-navy-200">
          Real Estate Associate Network
        </span>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">Great Empire</h1>
        <p className="mt-4 max-w-xl text-base text-navy-200">
          A single home for managing associates, approvals, and growth across the Great Empire network.
        </p>
        <Link to="/admin/login" className="mt-8">
          <Button size="md" className="px-6">
            Admin Login
          </Button>
        </Link>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-navy-400 sm:px-10">
        © {new Date().getFullYear()} Great Empire. All rights reserved.
      </footer>
    </div>
  )
}
