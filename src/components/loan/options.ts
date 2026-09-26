import { CHARGE_CATEGORIES, LENDER_CATEGORIES, LOAN_TYPES } from '@/lib/finance'
import type { TKey } from '@/lib/i18n'

type T = (key: TKey) => string
const opt = <V extends string>(values: readonly V[], prefix: string, t: T) =>
  values.map((v) => ({ value: v, label: t(`${prefix}.${v}` as TKey) }))

export const loanTypeOptions = (t: T) => opt(LOAN_TYPES, 'loanType', t)
export const lenderOptions = (t: T) => opt(LENDER_CATEGORIES, 'lender', t)
export const nbfcLayerOptions = (t: T) => opt(['upper', 'middle', 'base', 'unknown'] as const, 'nbfcLayer', t)
export const coopTierOptions = (t: T) => opt(['ucb-tier4', 'ucb-tier3', 'ucb-tier1-2', 'state-or-central', 'unknown'] as const, 'coopTier', t)
export const borrowerOptions = (t: T) => opt(['individual', 'mse', 'other', 'unknown'] as const, 'borrower', t)
export const purposeOptions = (t: T) => opt(['personal', 'business', 'unknown'] as const, 'purpose', t)
export const statusOptions = (t: T) => opt(['new', 'existing'] as const, 'status', t)
export const rateTypeOptions = (t: T) => opt(['fixed', 'floating', 'hybrid', 'unknown'] as const, 'rateType', t)
export const rateMethodOptions = (t: T) => opt(['reducing', 'flat', 'daily-reducing', 'monthly-reducing', 'unknown'] as const, 'rateMethod', t)
export const frequencyOptions = (t: T) => opt(['monthly', 'quarterly', 'fortnightly', 'weekly'] as const, 'frequency', t)
export const tenureUnitOptions = (t: T) => opt(['months', 'years', 'emis'] as const, 'unit', t)
export const valuesSourceOptions = (t: T) => opt(['documents', 'mixed', 'memory'] as const, 'valuesSource', t)
export const chargeCategoryOptions = (t: T) => opt(CHARGE_CATEGORIES, 'chargeCat', t)
export const paymentOptions = (t: T) => opt(['deducted', 'separate', 'in-emi', 'unknown'] as const, 'payment', t)
export const gstOptions = (t: T) => opt(['included', 'additional', 'not-applicable', 'unknown'] as const, 'gst', t)
export const recipientOptions = (t: T) =>
  opt(['lender', 'insurer', 'dealer', 'broker-lsp', 'government', 'third-party', 'unknown'] as const, 'recipient', t)
export const ynuOptions = (t: T) => [
  { value: 'yes' as const, label: t('common.yes') },
  { value: 'no' as const, label: t('common.no') },
  { value: 'unknown' as const, label: t('common.dontKnow') },
]
export const recurringFreqOptions = (t: T) => opt(['monthly', 'quarterly', 'annual'] as const, 'recurring', t)
export const recurringPaymentOptions = (t: T) => opt(['separate', 'in-emi', 'unknown'] as const, 'recurring', t)
export const contingentKindOptions = (t: T) => opt(['late-payment', 'bounce', 'penal', 'collection', 'other'] as const, 'contingent.kind', t)
