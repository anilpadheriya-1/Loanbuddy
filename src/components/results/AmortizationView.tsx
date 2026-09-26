import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { groupByYear, type Schedule } from '@/lib/finance'
import { formatINR, formatINRShort, formatPct } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function AmortizationView({
  schedule,
  ratePct,
  basis,
  periodsPerYear,
}: {
  schedule: Schedule
  ratePct: number
  basis: 'quoted' | 'implied' | 'flat-equivalent'
  periodsPerYear: number
}) {
  const { t, lang } = useI18n()
  const [showAll, setShowAll] = useState(false)
  const rows = schedule.rows
  const visible = showAll ? rows : rows.slice(0, 12)
  const years = useMemo(() => groupByYear(rows, periodsPerYear), [rows, periodsPerYear])
  const chartData = useMemo(() => {
    const step = Math.max(1, Math.floor(rows.length / 120))
    return rows.filter((_r, i) => i % step === 0 || i === rows.length - 1).map((r) => ({ period: r.period, balance: r.closing, interest: r.cumulativeInterest }))
  }, [rows])
  const basisText =
    basis === 'quoted' ? t('amort.basisQuoted', { rate: formatPct(ratePct) }) : basis === 'flat-equivalent' ? t('amort.basisFlat', { rate: formatPct(ratePct) }) : t('amort.basisImplied', { rate: formatPct(ratePct) })

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{basisText}</p>
      <Tabs defaultValue="table">
        <TabsList className="no-print">
          <TabsTrigger value="table">{t('amort.table')}</TabsTrigger>
          <TabsTrigger value="years">{t('amort.cards')}</TabsTrigger>
          <TabsTrigger value="chart">{t('amort.chart')}</TabsTrigger>
        </TabsList>
        <TabsContent value="table">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[44rem] text-sm">
              <caption className="sr-only">{t('results.s4')}</caption>
              <thead className="bg-muted/60 text-right text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium">{t('amort.month')}</th>
                  <th scope="col" className="px-3 py-2 font-medium">{t('amort.opening')}</th>
                  <th scope="col" className="px-3 py-2 font-medium">{t('amort.emi')}</th>
                  <th scope="col" className="px-3 py-2 font-medium">{t('amort.interest')}</th>
                  <th scope="col" className="px-3 py-2 font-medium">{t('amort.principal')}</th>
                  <th scope="col" className="px-3 py-2 font-medium">{t('amort.closing')}</th>
                  <th scope="col" className="px-3 py-2 font-medium">{t('amort.cumInterest')}</th>
                  <th scope="col" className="px-3 py-2 font-medium">{t('amort.cumPaid')}</th>
                </tr>
              </thead>
              <tbody className="num text-right">
                {visible.map((r) => (
                  <tr key={r.period} className="border-t">
                    <th scope="row" className="px-3 py-1.5 text-left font-normal">{r.period}</th>
                    <td className="px-3 py-1.5">{formatINR(r.opening)}</td>
                    <td className="px-3 py-1.5">{formatINR(r.emi, { paise: true })}</td>
                    <td className="px-3 py-1.5">{formatINR(r.interest, { paise: true })}</td>
                    <td className="px-3 py-1.5">{formatINR(r.principal, { paise: true })}</td>
                    <td className="px-3 py-1.5">{formatINR(r.closing)}</td>
                    <td className="px-3 py-1.5">{formatINR(r.cumulativeInterest)}</td>
                    <td className="px-3 py-1.5">{formatINR(r.cumulativePaid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 12 && (
            <Button variant="outline" size="sm" className="no-print mt-3" onClick={() => setShowAll((s) => !s)} aria-expanded={showAll}>
              {showAll ? t('amort.showLess') : t('amort.showAll', { n: rows.length })}
            </Button>
          )}
        </TabsContent>
        <TabsContent value="years">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {years.map((y) => (
              <li key={y.year} className="rounded-lg border bg-background/60 p-3 text-sm">
                <p className="font-semibold">
                  {t('amort.year')} {y.year}
                </p>
                <dl className="num mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                  <dt className="text-muted-foreground">{t('amort.paid')}</dt>
                  <dd className="text-right">{formatINR(y.paid)}</dd>
                  <dt className="text-muted-foreground">{t('amort.interest')}</dt>
                  <dd className="text-right">{formatINR(y.interest)}</dd>
                  <dt className="text-muted-foreground">{t('amort.principal')}</dt>
                  <dd className="text-right">{formatINR(y.principal)}</dd>
                  <dt className="text-muted-foreground">{t('amort.closing')}</dt>
                  <dd className="text-right font-semibold">{formatINR(y.closing)}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="chart">
          <figure>
            <figcaption className="sr-only">{t('amort.chartLabel')}</figcaption>
            <div className="h-72 w-full" role="img" aria-label={t('amort.chartLabel')}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                  <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 12, fill: 'var(--chart-axis)' }} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} />
                  <YAxis tickFormatter={(v: number) => formatINRShort(v, lang)} width={78} tick={{ fontSize: 12, fill: 'var(--chart-axis)' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '3 3' }}
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--popover-foreground)', fontSize: 12 }}
                    labelFormatter={(p) => `${t('amort.month')} ${p}`}
                    formatter={(v, name) => [formatINR(Number(v)), name === 'balance' ? t('amort.closing') : t('amort.cumInterest')]}
                  />
                  <Line type="monotone" dataKey="balance" stroke="var(--chart-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="interest" stroke="var(--chart-2)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <li className="flex items-center gap-2">
                <span className="inline-block h-0.5 w-5 rounded" style={{ background: 'var(--chart-1)' }} aria-hidden /> {t('amort.closing')}
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block h-0.5 w-5 rounded" style={{ background: 'var(--chart-2)' }} aria-hidden /> {t('amort.cumInterest')}
              </li>
            </ul>
          </figure>
        </TabsContent>
      </Tabs>
    </div>
  )
}
