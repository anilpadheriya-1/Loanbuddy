/**
 * Numerical root finding used by IRR / implied-rate calculations.
 *
 * We use a safeguarded Newton method (Newton steps that fall outside the
 * current bracket are replaced by bisection). It always keeps a valid bracket,
 * so it cannot diverge, and it converges quadratically near the root.
 * If no sign change can be found we report failure instead of inventing a number.
 */

export type SolveResult =
  | { ok: true; root: number; iterations: number }
  | { ok: false; reason: 'no-bracket' | 'no-convergence' | 'invalid-input' }

export interface SolveOptions {
  /** Absolute tolerance on the root. */
  tolerance?: number
  maxIterations?: number
}

function numericDerivative(f: (x: number) => number, x: number): number {
  const h = Math.max(1e-7, Math.abs(x) * 1e-7)
  return (f(x + h) - f(x - h)) / (2 * h)
}

/**
 * Find x in [lo, hi] with f(x) = 0. If f(lo) and f(hi) have the same sign, the
 * upper bound is expanded a few times (useful for very high rates) before giving up.
 */
export function findRoot(
  f: (x: number) => number,
  lo: number,
  hi: number,
  options: SolveOptions = {},
): SolveResult {
  const tolerance = options.tolerance ?? 1e-12
  const maxIterations = options.maxIterations ?? 500
  if (!(lo < hi) || !Number.isFinite(lo) || !Number.isFinite(hi)) {
    return { ok: false, reason: 'invalid-input' }
  }

  let fLo = f(lo)
  let fHi = f(hi)
  let expansions = 0
  while (Number.isFinite(fLo) && Number.isFinite(fHi) && fLo * fHi > 0 && expansions < 8) {
    hi = hi * 2 + 1
    fHi = f(hi)
    expansions++
  }
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi)) return { ok: false, reason: 'invalid-input' }
  if (fLo === 0) return { ok: true, root: lo, iterations: 0 }
  if (fHi === 0) return { ok: true, root: hi, iterations: 0 }
  if (fLo * fHi > 0) return { ok: false, reason: 'no-bracket' }

  let x = (lo + hi) / 2
  for (let i = 1; i <= maxIterations; i++) {
    const fx = f(x)
    if (fx === 0) return { ok: true, root: x, iterations: i }
    // Shrink the bracket around the sign change.
    if (fx * fLo < 0) {
      hi = x
      fHi = fx
    } else {
      lo = x
      fLo = fx
    }
    const d = numericDerivative(f, x)
    let next = d !== 0 && Number.isFinite(d) ? x - fx / d : NaN
    if (!(next > lo && next < hi)) next = (lo + hi) / 2
    if (Math.abs(next - x) < tolerance || hi - lo < tolerance) {
      return { ok: true, root: next, iterations: i }
    }
    x = next
  }
  return { ok: false, reason: 'no-convergence' }
}
