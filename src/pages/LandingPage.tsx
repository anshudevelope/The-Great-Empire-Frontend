import React from 'react'
import { Link } from 'react-router-dom'

// Embedded SVGs to ensure standalone execution without component import errors
function BuildingIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5s.75 0 .75.75v1.5c0 .75-.75.75-.75.75H9m0-3H7.5s-.75 0-.75.75v1.5c0 .75.75.75.75.75H9m0-3v3m0 3.75h1.5s.75 0 .75.75v1.5c0 .75-.75.75-.75.75H9m0-3H7.5s-.75 0-.75.75v1.5c0 .75.75.75.75.75H9m0-3v3m0 3.75h1.5s.75 0 .75.75v1.5c0 .75-.75.75-.75.75H9m0-3H7.5s-.75 0-.75.75v1.5c0 .75.75.75.75.75H9m0-3v3" />
    </svg>
  )
}

function DashboardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
    </svg>
  )
}

function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  )
}

const SERVICES = [
  { 
    icon: BuildingIcon, 
    label: 'Portfolio Advisory', 
    description: 'Strategic asset allocation and yield optimization tailored for residential and commercial investors.' 
  },
  { 
    icon: DashboardIcon, 
    label: 'Market Intelligence', 
    description: 'Data-driven neighborhood analytics, valuation trends, and predictive growth forecasts.' 
  },
  { 
    icon: UsersIcon, 
    label: 'Private Brokerage', 
    description: 'Bespoke acquisition and disposition services for high-net-worth individuals and developers.' 
  },
]

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-blue-950">
      
      {/* Header Navigation */}
      <header className="flex items-center justify-between border-b border-blue-100 bg-white px-6 py-5 sm:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-900 text-white shadow-xs">
            <BuildingIcon className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-blue-950">
            Great Empire
          </span>
        </div>

        <nav className="flex items-center gap-3">
          <Link to="/associate/login">
            <button className="rounded-lg px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-50 transition-colors">
              Associate Portal
            </button>
          </Link>
        </nav>
      </header>

      {/* Main Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center sm:py-28">
        
        {/* Subtle Badge Tag */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
          Real Estate Advisory & Consulting
        </div>

        {/* Hero Title */}
        <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-blue-950 sm:text-5xl lg:text-6xl leading-tight">
          Elevate your property strategy with <span className="text-blue-600">institutional clarity</span>
        </h1>

        {/* Hero Description */}
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-blue-800/80 sm:text-lg">
          Great Empire provides premier real estate advisory, market intelligence, and portfolio optimization for private clients, developers, and institutional investors.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col items-center gap-3.5 sm:flex-row">
          <Link to="/associate/login">
            <button className="w-full sm:w-auto rounded-lg bg-blue-900 px-7 py-3 text-sm font-semibold text-white shadow-xs hover:bg-blue-800 transition-colors">
              Book Consultation
            </button>
          </Link>
        </div>

        {/* Services Cards */}
        <div className="mt-20 grid w-full max-w-5xl grid-cols-1 gap-6 text-left sm:grid-cols-3">
          {SERVICES.map((service) => (
            <div 
              key={service.label} 
              className="rounded-xl border border-blue-100 bg-white p-7 shadow-xs transition-shadow hover:shadow-md"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <service.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-blue-950">{service.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-blue-800/70">{service.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-blue-100 bg-white px-6 py-6 text-center text-xs text-blue-700/70 sm:px-10">
        © {new Date().getFullYear()} Great Empire Consulting Group. All rights reserved.
      </footer>
    </div>
  )
}