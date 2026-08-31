import type { ReactNode } from 'react'

export function TableContainer({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-white shadow-card">
      <table className="w-full min-w-[760px] text-left text-sm">{children}</table>
    </div>
  )
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={`border-b border-border bg-navy-50/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-subtle ${className ?? ''}`}
    >
      {children}
    </th>
  )
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle text-text ${className ?? ''}`}>{children}</td>
}
