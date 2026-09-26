import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { usePageTitle } from '@/components/layout/usePageTitle'

export default function NotFoundPage() {
  usePageTitle('Page not found')
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center" lang="en">
      <p className="text-sm font-semibold text-brand">404</p>
      <h1 className="mt-2 text-3xl font-bold">We couldn’t find that page</h1>
      <p className="mt-3 text-muted-foreground">The link may be old or mistyped. Your saved calculations are safe in this browser.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/check-loan">Check a loan</Link>
        </Button>
      </div>
    </div>
  )
}
