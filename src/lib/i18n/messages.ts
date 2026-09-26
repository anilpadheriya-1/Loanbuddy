import type { EngineMessage } from '@/lib/finance'
import { formatINR, formatPct, formatPp, type Lang } from '@/lib/format'
import { translate, type Params } from './index'

/** Param names that hold ₹ amounts or rates in engine messages. */
const MONEY = new Set(['amount', 'entered', 'expected', 'difference', 'disbursed', 'sanctioned', 'received', 'principal', 'emi', 'saved'])
const RATES = new Set(['rate'])
const PP = new Set(['gap'])

export function formatParams(params: EngineMessage['params']): Params | undefined {
  if (!params) return undefined
  const out: Params = {}
  for (const [k, v] of Object.entries(params)) {
    if (typeof v !== 'number') out[k] = v
    else if (MONEY.has(k)) out[k] = formatINR(k === 'difference' ? Math.abs(v) : v)
    else if (RATES.has(k)) out[k] = formatPct(v)
    else if (PP.has(k)) out[k] = formatPp(v, 2, '').trim()
    else if (k === 'pct') out[k] = formatPct(v, 1)
    else out[k] = v
  }
  return out
}

/** Render an engine message with a namespace prefix, e.g. ('warn', {code:'emi-mismatch'}). */
export function renderMessage(namespace: string, msg: EngineMessage, lang: Lang, extra?: Params): string {
  const params = { ...formatParams(msg.params), ...extra }
  if (msg.code === 'emi-derived' && namespace === 'assume' && msg.params?.method) {
    params.method = translate(lang, msg.params.method === 'flat' ? 'rateMethod.flat' : 'rateMethod.reducing')
  }
  return translate(lang, `${namespace}.${msg.code}`, params)
}
