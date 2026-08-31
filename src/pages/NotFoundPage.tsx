import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-navy-500">404</p>
      <h1 className="text-2xl font-semibold text-text">Page not found</h1>
      <p className="max-w-sm text-sm text-text-subtle">The page you're looking for doesn't exist or may have been moved.</p>
      <Link to="/" className="mt-4">
        <Button variant="secondary">Back to home</Button>
      </Link>
    </div>
  )
}
