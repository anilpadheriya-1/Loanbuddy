import { useEffect } from 'react'

/** Set the document title (and description) per page for accessibility and SEO. */
export function usePageTitle(title: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Loan Reality India` : 'Loan Reality India — Know what your loan really costs'
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  }, [title, description])
}
