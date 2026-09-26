/**
 * Compare our estimated effective annualized cost with the APR printed in the
 * lender's KFS. A difference is NOT evidence of wrongdoing: the lender may
 * treat timing or a charge differently, or a number may have been entered
 * differently. It is a prompt to ask how the APR was calculated.
 */
export type AprComparison = 'close' | 'estimate-higher' | 'estimate-lower'

export const APR_TOLERANCE_PP = 0.25

export function compareWithLenderApr(estimatePct: number, lenderAprPct: number): { status: AprComparison; differencePp: number } {
  const differencePp = estimatePct - lenderAprPct
  if (Math.abs(differencePp) <= APR_TOLERANCE_PP) return { status: 'close', differencePp }
  return { status: differencePp > 0 ? 'estimate-higher' : 'estimate-lower', differencePp }
}
