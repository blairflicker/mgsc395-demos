/**
 * Chapter 1 productivity measures — pure computation, no React.
 *
 * Conventions match the Chapter 1 lecture exactly:
 * - Every productivity measure is output over input; only the input
 *   changes between measures.
 * - Single-factor (labor): labor-hours = workers × hours; productivity
 *   = output / labor-hours; value productivity = output × unit value /
 *   labor-hours.
 * - Multifactor: total input = labor + materials + overhead dollars;
 *   MFP = output / total input (units per input $); unit cost is the
 *   reciprocal, total input / output; revenue = output × price; value
 *   MFP = revenue / total input ($ out per $ in).
 * - Class single-factor data (the carpet crew): 4 workers × 8 h =
 *   32 labor-hours; 720 / 32 = 22.5 sq yd per labor-hour;
 *   720 × $8 / 32 = $180 per labor-hour.
 * - Class multifactor data (the factory): total input = 1,000 + 520 +
 *   2,000 = $3,520; MFP = 7,040 / 3,520 = 2.0 units per $; unit cost =
 *   3,520 / 7,040 = $0.50; revenue = 7,040 × $2 = $14,080; value MFP =
 *   14,080 / 3,520 = 4.0.
 */

export interface SingleFactorCase {
  /** crew size, workers */
  workers: number
  /** hours worked per worker */
  hours: number
  /** units produced (sq yd of carpet installed) */
  output: number
  /** what one unit of output is, e.g. 'sq yd of carpet' */
  outputLabel: string
  /** dollars of value per unit of output */
  unitValue: number
}

/** The carpet-crew problem from the Chapter 1 slides. */
export const CLASS_SINGLE: SingleFactorCase = {
  workers: 4,
  hours: 8,
  output: 720,
  outputLabel: 'sq yd of carpet',
  unitValue: 8,
}

export const laborHours = (c: SingleFactorCase): number => c.workers * c.hours

export const unitsPerLaborHour = (c: SingleFactorCase): number =>
  c.output / laborHours(c)

export const valuePerLaborHour = (c: SingleFactorCase): number =>
  (c.output * c.unitValue) / laborHours(c)

export interface MultiFactorCase {
  /** monthly output, units */
  output: number
  /** labor cost, $/month */
  labor: number
  /** materials cost, $/month */
  materials: number
  /** overhead, $/month */
  overhead: number
  /** selling price, $/unit */
  price: number
}

/** The factory problem from the Chapter 1 slides. */
export const CLASS_MULTI: MultiFactorCase = {
  output: 7040,
  labor: 1000,
  materials: 520,
  overhead: 2000,
  price: 2,
}

export const totalInput = (c: MultiFactorCase): number =>
  c.labor + c.materials + c.overhead

/** multifactor productivity, units per input dollar */
export const mfp = (c: MultiFactorCase): number => c.output / totalInput(c)

/** the reciprocal view — input dollars per unit */
export const unitCost = (c: MultiFactorCase): number => totalInput(c) / c.output

export const revenue = (c: MultiFactorCase): number => c.output * c.price

/** value-based multifactor productivity, $ out per $ in */
export const valueMfp = (c: MultiFactorCase): number =>
  revenue(c) / totalInput(c)

/**
 * A random carpet crew: 2–6 workers on 4–10 hour days. The productivity
 * rate is picked first (one decimal place, 8–35 sq yd per labor-hour) and
 * output derived from it, regenerating until the sq yd come out whole —
 * so the answer always reads cleanly. Unit value is $2–$15 whole dollars.
 */
export function randomSingle(): SingleFactorCase {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const workers = 2 + Math.floor(Math.random() * 5)
    const hours = 4 + Math.floor(Math.random() * 7)
    const rate = (80 + Math.floor(Math.random() * 271)) / 10
    const output = rate * workers * hours
    if (!Number.isInteger(output)) continue
    return {
      workers,
      hours,
      output,
      outputLabel: 'sq yd of carpet',
      unitValue: 2 + Math.floor(Math.random() * 14),
    }
  }
  // practically unreachable
  return { ...CLASS_SINGLE }
}

/**
 * MFP values whose reciprocal (the unit cost) is still clean money —
 * $2.00, $1.25, $1.00, $0.50, $0.40, $0.25 respectively.
 */
const MFP_CHOICES = [0.5, 0.8, 1, 2, 2.5, 4] as const

const PRICE_CHOICES = [
  0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12,
] as const

const near = (v: number, target: number) => Math.abs(v - target) < 1e-6

/**
 * A random factory: MFP is picked first, total input is a round number
 * ($1,000–$20,000 to the nearest $10) split into labor / materials /
 * overhead sums that land on $10 and add up exactly, and the price is a
 * clean value chosen so value MFP falls in [1.2, 6] with at most two
 * decimals and a whole-dollar revenue. Regenerates until every number
 * reads cleanly.
 */
export function randomMulti(): MultiFactorCase {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const m = MFP_CHOICES[Math.floor(Math.random() * MFP_CHOICES.length)]
    const total = 10 * (100 + Math.floor(Math.random() * 1901))
    const output = Math.round(m * total)
    if (!near(output / total, m)) continue
    const labor = 10 * Math.round((total * (0.15 + Math.random() * 0.3)) / 10)
    const materials =
      10 * Math.round((total * (0.1 + Math.random() * 0.25)) / 10)
    const overhead = total - labor - materials
    if (labor < 100 || materials < 100 || overhead < 100) continue
    const prices = PRICE_CHOICES.filter((p) => {
      const v = m * p
      return (
        v >= 1.2 - 1e-6 &&
        v <= 6 + 1e-6 &&
        near(v * 100, Math.round(v * 100)) &&
        near(output * p, Math.round(output * p))
      )
    })
    if (prices.length === 0) continue
    const price = prices[Math.floor(Math.random() * prices.length)]
    return { output, labor, materials, overhead, price }
  }
  // practically unreachable
  return { ...CLASS_MULTI }
}
