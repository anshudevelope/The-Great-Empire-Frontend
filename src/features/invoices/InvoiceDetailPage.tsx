import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { fetchInvoice } from '@/api/invoices'
import { useAuthStore } from '@/store/authStore'
import { InvoiceDocument } from './InvoiceDocument'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin')
  const listPath = isAdmin ? '/admin/invoices' : '/portal/invoices'

  const { data, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => fetchInvoice(id as string),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  const invoice = data?.data
  if (!invoice) return <EmptyState title="Invoice not found" description="This invoice may have been removed." />

  return (
    <div className="flex flex-col gap-4">
      {/* Everything outside .print-area is hidden by the print stylesheet. */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">Invoice {invoice.invoiceNo}</h1>
          <p className="mt-1 text-sm text-text-subtle">
            {invoice.transaction.type} · {invoice.transaction.referenceNo}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={listPath}>
            <Button variant="secondary">Back</Button>
          </Link>
          {/* The browser's print dialog is also its "Save as PDF" — this gives a
              real, shareable file without shipping a PDF renderer. */}
          <Button onClick={() => window.print()}>Download / Print</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-white">
        <InvoiceDocument invoice={invoice} />
      </div>
    </div>
  )
}
