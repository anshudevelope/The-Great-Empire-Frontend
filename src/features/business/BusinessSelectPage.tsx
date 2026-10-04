import { useCompanyBrand } from '@/api/company'
import { BUSINESS_LIST, type Business } from '@/lib/business'
import { useAuthStore } from '@/store/authStore'
import { BuildingIcon, ChevronRightIcon, ShieldIcon } from '@/components/icons/icons'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useSwitchBusiness } from './useSwitchBusiness'

const ICONS: Record<Business, typeof ShieldIcon> = { t1: ShieldIcon, t2: BuildingIcon }

/**
 * The first screen after an admin signs in: two businesses, one console. Same
 * chrome and tokens as the console itself, so it reads as part of it.
 */
export function BusinessSelectPage() {
  const company = useCompanyBrand()
  const user = useAuthStore((state) => state.user)
  const openBusiness = useSwitchBusiness()

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex h-16 shrink-0 items-center justify-between bg-chrome px-4 md:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-control bg-chrome-active text-on-chrome">
            <BuildingIcon className="h-4 w-4" />
          </div>
          <p className="truncate text-[14px] font-semibold tracking-tight text-on-chrome">{company.name}</p>
        </div>
        {/* Last item on the bar, so its tooltip opens leftwards instead of past the edge. */}
        <ThemeToggle tooltipAlign="end" />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-text">
              Welcome{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
            </h1>
            <p className="mt-1.5 text-sm text-text-muted">Choose the business you want to manage.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {BUSINESS_LIST.map((business) => {
              const Icon = ICONS[business.id]
              return (
                <button
                  key={business.id}
                  type="button"
                  onClick={() => openBusiness(business.id)}
                  className="group flex cursor-pointer flex-col gap-4 rounded-card border border-border bg-surface p-6 text-left shadow-card transition-shadow hover:border-border-strong hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-control bg-info-bg text-info">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-pill border border-border px-2.5 py-0.5 text-xs font-semibold text-text-muted">
                      {business.code}
                    </span>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-text">{business.label}</p>
                    <p className="mt-1 text-sm leading-relaxed text-text-muted">{business.description}</p>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-info">
                    Open {business.label}
                    <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
