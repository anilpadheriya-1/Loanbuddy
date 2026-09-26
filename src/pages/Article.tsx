import { Link, useParams } from 'react-router'
import { ArrowLeft, Lightbulb, MessageCircleQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Disclaimer } from '@/components/layout/Disclaimer'
import { usePageTitle } from '@/components/layout/usePageTitle'
import { articleBySlug } from '@/content/articles'
import { sourceById } from '@/content/sources'
import NotFoundPage from './NotFound'

export default function ArticlePage() {
  const { slug = '' } = useParams()
  const a = articleBySlug(slug)
  usePageTitle(a?.title ?? 'Not found', a?.summary)
  if (!a) return <NotFoundPage />
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-10" lang="en">
      <Button asChild variant="link" className="no-print">
        <Link to="/learn">
          <ArrowLeft aria-hidden /> All guides
        </Link>
      </Button>
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">{a.title}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{a.summary}</p>
      </header>
      <div className="space-y-4 text-[15px] leading-relaxed">
        {a.body.map((b, i) => {
          if (b.type === 'p') return <p key={i}>{b.text}</p>
          if (b.type === 'list')
            return (
              <ul key={i} className="list-disc space-y-1.5 pl-5">
                {b.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            )
          if (b.type === 'tip')
            return (
              <p key={i} className="flex gap-3 rounded-lg border border-brand/20 bg-info-soft p-4 text-sm">
                <Lightbulb className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
                <span>{b.text}</span>
              </p>
            )
          return (
            <figure key={i} className="rounded-xl border bg-card p-4">
              <figcaption className="text-sm font-semibold">{b.title}</figcaption>
              <table className="mt-2 w-full text-sm">
                <tbody>
                  {b.rows.map(([k, v]) => (
                    <tr key={k} className="border-b last:border-b-0">
                      <th scope="row" className="py-2 pr-3 text-left font-normal text-muted-foreground">
                        {k}
                      </th>
                      <td className="num py-2 text-right font-semibold">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {b.note && <p className="mt-2 text-xs text-muted-foreground">{b.note}</p>}
            </figure>
          )
        })}
      </div>
      <section className="rounded-xl border bg-card p-4" aria-labelledby="ask">
        <h2 id="ask" className="flex items-center gap-2 font-semibold">
          <MessageCircleQuestion className="size-5 text-brand" aria-hidden /> Questions to ask your lender
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {a.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </section>
      {a.sourceIds && a.sourceIds.length > 0 && (
        <section aria-labelledby="src">
          <h2 id="src" className="text-sm font-semibold">
            Sources
          </h2>
          <ul className="mt-1 space-y-1 text-sm">
            {a.sourceIds.map((id) => {
              const s = sourceById(id)
              return s ? (
                <li key={id}>
                  <Link to={`/rules#${id}`} className="text-brand underline-offset-2 hover:underline">
                    {s.title}
                  </Link>{' '}
                  <span className="text-muted-foreground">({s.regulator})</span>
                </li>
              ) : null
            })}
          </ul>
        </section>
      )}
      {a.related && (
        <nav aria-label="Related guides" className="flex flex-wrap gap-2">
          {a.related.map((slug) => {
            const r = articleBySlug(slug)
            return r ? (
              <Link key={slug} to={`/learn/${slug}`} className="inline-flex min-h-9 items-center rounded-full border bg-card px-3 text-sm hover:bg-accent">
                {r.title}
              </Link>
            ) : null
          })}
        </nav>
      )}
      <Button asChild variant="brand">
        <Link to="/check-loan">Check my loan</Link>
      </Button>
      <Disclaimer />
    </article>
  )
}
