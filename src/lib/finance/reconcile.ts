import { calculateEmi } from './emi'
import { flatEmi } from './flat'
import { impliedAnnualRate } from './implied-rate'
import type { RateMethod } from './types'

/**
 * Does the EMI the borrower entered match the EMI implied by the quoted rate?
 * A mismatch is NOT evidence of wrongdoing: rounding, broken-period interest,
 * insurance inside the EMI, a flat-rate method or a rate reset can all explain it.
 */
export type ReconcileStatus =
  | 'match'
  /** Quoted method is not flat (or unknown) but the EMI matches a flat-rate calculation. */
  | 'matches-flat'
  | 'mismatch'

export interface Reconciliation {
  status: ReconcileStatus
  enteredEmi: number
  /** EMI implied by the quoted rate on a reducing-balance basis. */
  expectedReducingEmi: number
  /** EMI implied by the quoted rate on a flat-rate basis. */
  expectedFlatEmi: number
  /** The expected EMI for the stated method (flat if method is flat, reducing otherwise). */
  expectedEmi: number
  difference: number
  differencePct: number
  impliedRatePct: number | null
  /** implied − quoted, percentage points (reducing basis). */
  rateGapPp: number | null
  tolerance: number
  possibleReasons: string[]
}

export interface ReconcileInput {
  principal: number
  quotedRatePct: number
  emi: number
  n: number
  method: RateMethod
  periodsPerYear?: number
  advanceCount?: number
  deferPeriods?: number
}

export function emiTolerance(emi: number): number {
  return Math.max(1, emi * 0.001)
}

export function reconcileEmi(input: ReconcileInput): Reconciliation {
  const k = input.periodsPerYear ?? 12
  const opts = { periodsPerYear: k, advanceCount: input.advanceCount, deferPeriods: input.deferPeriods }
  const expectedReducingEmi = calculateEmi(input.principal, input.quotedRatePct, input.n, opts)
  const expectedFlatEmi = flatEmi(input.principal, input.quotedRatePct, input.n, k)
  const expectedEmi = input.method === 'flat' ? expectedFlatEmi : expectedReducingEmi
  const tolerance = emiTolerance(input.emi)
  const difference = input.emi - expectedEmi
  const impliedRatePct = impliedAnnualRate(input.principal, input.emi, input.n, opts)

  let status: ReconcileStatus
  if (Math.abs(difference) <= tolerance) status = 'match'
  else if (input.method !== 'flat' && input.quotedRatePct > 0 && Math.abs(input.emi - expectedFlatEmi) <= tolerance)
    status = 'matches-flat'
  else status = 'mismatch'

  const possibleReasons: string[] = []
  if (status === 'matches-flat') possibleReasons.push('flat-method')
  if (status === 'mismatch') {
    if (Math.abs(difference) <= Math.max(10, input.emi * 0.005)) possibleReasons.push('rounding')
    if (difference > 0) {
      possibleReasons.push('insurance-in-emi', 'fees-in-emi', 'pre-emi', 'irregular-first-emi')
      if (input.method !== 'flat') possibleReasons.push('flat-method')
    } else {
      possibleReasons.push('subvention-or-discount', 'irregular-first-emi')
    }
    possibleReasons.push('day-count', 'rate-reset')
  }

  return {
    status,
    enteredEmi: input.emi,
    expectedReducingEmi,
    expectedFlatEmi,
    expectedEmi,
    difference,
    differencePct: expectedEmi > 0 ? (difference / expectedEmi) * 100 : 0,
    impliedRatePct,
    rateGapPp: impliedRatePct === null ? null : impliedRatePct - input.quotedRatePct,
    tolerance,
    possibleReasons,
  }
}
