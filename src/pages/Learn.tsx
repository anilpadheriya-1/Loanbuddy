import { Link } from 'react-router'
import { Clock } from 'lucide-react'
import { usePageTitle } from '@/components/layout/usePageTitle'
import { ARTICLES, CATEGORY_LABELS, type ArticleCategory } from '@/content/articles'
import { GLOSSARY } from '@/content/glossary'

const ORDER: ArticleCategory[] = ['basics', 'rates', 'charges', 'repayment', 'rights', 'credit']

export default function LearnPage() {
  usePageTitle('Learn', 'Short, practical guides to loan costs in India: flat vs reducing rates, APR, KFS, processing fees, prepayment, balance transfer and more.')
  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-6 sm:py-10" lang="en">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Learn how loan cost works</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Short, practical guides with worked ₹ examples and the questions to ask your lender. Examples are illustrations, not real lender offers.
        </p>
      </header>
      {ORDER.map((cat) => {
        const items = ARTICLES.filter((a) => a.category === cat)
        return (
          <section key={cat} aria-labelledby={`cat-${cat}`}>
            <h2 id={`cat-${cat}`} className="text-lg font-semibold">
              {CATEGORY_LABELS[cat]}
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {items.map((a) => (
                <li key={a.slug}>
                  <Link to={`/learn/${a.slug}`} className="block h-full rounded-xl border bg-card p-4 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
                    <p className="font-semibold">{a.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{a.summary}</p>
                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3.5" aria-hidden /> {a.minutes} min read
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
      <section aria-labelledby="glossary" className="rounded-xl border bg-card p-4 sm:p-6">
        <h2 id="glossary" className="text-lg font-semibold">
          Glossary
        </h2>
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {GLOSSARY.map((g) => (
            <div key={g.term}>
              <dt className="font-semibold">{g.term}</dt>
              <dd className="text-sm text-muted-foreground">{g.definition}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
