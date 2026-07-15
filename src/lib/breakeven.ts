/**
 * Supplement A break-even analysis — pure computation, no React.
 *
 * Conventions match the Supplement A lecture exactly:
 * - One process: revenue pQ, total cost F + cQ, contribution p − c,
 *   break-even Q_BE = F / (p − c), profit (p − c)Q − F.
 * - Two processes (make or buy): make costs F_make + c_make·Q, buy costs
 *   F_buy + c_buy·Q, and the indifference point is
 *   Q = (F_make − F_buy) / (c_buy − c_make). Make carries the higher fixed
 *   cost and the lower variable cost, so buy wins below the crossing and
 *   make wins above it.
 * - Class single (the hospital): p = $200/patient, c = $100/patient,
 *   F = $100,000/yr → contribution $100, Q_BE = 1,000 patients,
 *   profit −$100,000 at 0 patients and +$100,000 at 2,000 patients.
 * - Class compare (the printer): F_make = $549, c_make = $0.163/page,
 *   F_buy = $0, c_buy = $0.68/page → Q = 549 / 0.517 ≈ 1,061.9 pages;
 *   buy is cheaper for Q ≤ 1,061 and make is cheaper for Q ≥ 1,062.
 */

export interface SingleCase {
  /** selling price, $/unit */
  price: number
  /** variable cost, $/unit */
  varCost: number
  /** fixed cost, $/yr */
  fixed: number
}

/** The one-process problem from the Supplement A slides (the hospital). */
export const CLASS_SINGLE: SingleCase = { price: 200, varCost: 100, fixed: 100000 }

/** Contribution per unit, p − c. */
export const contribution = (s: SingleCase): number => s.price - s.varCost

/** Break-even volume, Q_BE = F / (p − c). */
export const qBreakEven = (s: SingleCase): number => s.fixed / contribution(s)

/** Total revenue at Q, pQ. */
export const revenueAt = (s: SingleCase, Q: number): number => s.price * Q

/** Total cost at Q, F + cQ. */
export const costAt = (s: SingleCase, Q: number): number =>
  s.fixed + s.varCost * Q

/** Profit at Q, (p − c)Q − F. */
export const profitAt = (s: SingleCase, Q: number): number =>
  contribution(s) * Q - s.fixed

export interface CompareCase {
  /** make option's fixed cost, $ */
  fixedMake: number
  /** make option's variable cost, $/unit */
  varMake: number
  /** buy option's fixed cost, $ */
  fixedBuy: number
  /** buy option's variable cost, $/unit */
  varBuy: number
}

/** The make-or-buy problem from the Supplement A slides (the printer). */
export const CLASS_COMPARE: CompareCase = {
  fixedMake: 549,
  varMake: 0.163,
  fixedBuy: 0,
  varBuy: 0.68,
}

/** Indifference volume, Q = (F_make − F_buy) / (c_buy − c_make). */
export const qIndifference = (c: CompareCase): number =>
  (c.fixedMake - c.fixedBuy) / (c.varBuy - c.varMake)

/** Total cost of making at Q. */
export const makeCostAt = (c: CompareCase, Q: number): number =>
  c.fixedMake + c.varMake * Q

/** Total cost of buying at Q. */
export const buyCostAt = (c: CompareCase, Q: number): number =>
  c.fixedBuy + c.varBuy * Q

/** smallest "nice" step (1/2/2.5/5 × 10^k) at least as big as `rough` */
function niceStep(rough: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(rough, 1e-9))))
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * pow >= rough) return m * pow
  }
  return 10 * pow
}

/**
 * Chart x-axis maximum: about twice the crossing volume, rounded up to a
 * nice number (class data: 2,000 patients around Q_BE = 1,000, and
 * 2,250 pages around Q ≈ 1,061.9).
 */
export function chartMax(qCross: number): number {
  const raw = 2 * qCross
  const step = niceStep(raw / 10)
  return Math.ceil(raw / step - 1e-9) * step
}

/** Snap step for the grabbable chosen-Q line (class data: 10). */
export const chartStep = (xMax: number): number => niceStep(xMax / 240)

/**
 * A plausible random one-process problem: p a clean value in [$20, $500],
 * c a clean fraction of p so the contribution stays clean and never comes
 * close to zero, and F round so Q_BE lands in [100, 20,000] (a fractional
 * Q_BE is fine — even instructive).
 */
export function randomSingle(): SingleCase {
  const prices = [20, 25, 30, 40, 50, 60, 75, 80, 100, 120, 150, 200, 250, 300, 400, 500]
  const fracs = [0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8]
  for (let attempt = 0; attempt < 1000; attempt++) {
    const price = prices[Math.floor(Math.random() * prices.length)]
    const frac = fracs[Math.floor(Math.random() * fracs.length)]
    const varCost = Math.round(price * frac * 4) / 4
    // keep the variable cost clean (a multiple of 25¢) and the margin real
    if (varCost * 4 !== Math.round(price * frac * 4) || price - varCost < 4) continue
    const cm = price - varCost
    // log-uniform target so small and large break-even volumes both appear
    const target = Math.exp(Math.log(100) + Math.random() * Math.log(20000 / 100))
    const rawF = target * cm
    const roundTo =
      rawF >= 200000 ? 25000 : rawF >= 50000 ? 10000 : rawF >= 10000 ? 2500 : rawF >= 2000 ? 500 : 100
    const fixed = Math.round(rawF / roundTo) * roundTo
    if (fixed <= 0) continue
    const s: SingleCase = { price, varCost, fixed }
    const qbe = qBreakEven(s)
    if (qbe >= 100 && qbe <= 20000) return s
  }
  // practically unreachable — a known-good problem just in case
  return { price: 250, varCost: 150, fixed: 250000 }
}

/**
 * A plausible random make-or-buy problem: make always has the higher fixed
 * cost and the lower per-unit cost, buy's fixed cost is usually $0 but
 * occasionally positive, and the indifference point lands in [200, 20,000].
 * Per-unit costs carry cents.
 */
export function randomCompare(): CompareCase {
  for (let attempt = 0; attempt < 1000; attempt++) {
    // buy: 30¢–$6.00 per unit in 5¢ steps
    const varBuy = (30 + 5 * Math.floor(Math.random() * 115)) / 100
    // make: a clear per-unit discount, rounded to the cent
    const keep = [0.15, 0.2, 0.25, 0.3, 0.4, 0.5][Math.floor(Math.random() * 6)]
    const varMake = Math.round(varBuy * keep * 100) / 100
    const diff = Math.round((varBuy - varMake) * 100) / 100
    if (diff < 0.1) continue
    const fixedBuy = Math.random() < 0.75 ? 0 : 25 * (1 + Math.floor(Math.random() * 20))
    // log-uniform target so small and large crossings both appear
    const target = Math.exp(Math.log(200) + Math.random() * Math.log(20000 / 200))
    const fixedMake = Math.round(fixedBuy + target * diff)
    if (fixedMake - fixedBuy < 50) continue
    const c: CompareCase = { fixedMake, varMake, fixedBuy, varBuy }
    const q = qIndifference(c)
    if (q >= 200 && q <= 20000) return c
  }
  // practically unreachable — a known-good problem just in case
  return { fixedMake: 600, varMake: 0.2, fixedBuy: 0, varBuy: 0.7 }
}
