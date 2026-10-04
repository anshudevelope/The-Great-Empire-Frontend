import { cn } from '@/lib/cn'
import { BUSINESS_LIST } from '@/lib/business'
import { useBusinessStore } from '@/store/businessStore'
import { useSwitchBusiness } from '@/features/business/useSwitchBusiness'

/**
 * T1 / T2 segmented control on the chrome, beside the theme toggle. The
 * selected half uses the sidebar's selected-row fill so the two read as one
 * system. Labels collapse to the codes on small screens.
 */
export function BusinessSwitcher() {
  const business = useBusinessStore((state) => state.business)
  const switchTo = useSwitchBusiness()

  return (
    <div role="radiogroup" aria-label="Business" className="flex items-center gap-0.5 rounded-control bg-chrome-hover p-0.5">
      {BUSINESS_LIST.map((item) => {
        const active = item.id === business
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => !active && switchTo(item.id)}
            className={cn(
              'cursor-pointer rounded-control px-2.5 py-1.5 text-xs font-semibold transition-colors',
              active
                ? 'bg-chrome-selected text-on-chrome shadow-chrome-selected'
                : 'text-on-chrome-muted hover:text-on-chrome',
            )}
          >
            {item.code}
            <span className="hidden sm:inline"> · {item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
