/**
 * Chapter 3 statistical process control — pure computation, no React.
 *
 * Conventions match the Chapter 3 lecture exactly:
 * - Samples of n bottles are "boxed": only X̄_j (sample mean) and R_j
 *   (sample range) are ever seen again, never the individual bottles.
 * - X̿ = average of sample means, R̄ = average of sample ranges.
 * - X̄-chart limits: X̿ ± A₂·R̄. R-chart limits: D₄·R̄ and D₃·R̄.
 * - Class data (10 samples of n = 5 from the slides): X̿ = 12.00,
 *   R̄ = 0.15, UCL_X̄ = 12.09, LCL_X̄ = 11.91, UCL_R = 0.32, LCL_R = 0.
 *
 * The data-generating process ("the truth" behind a problem): bottles are
 * drawn Normal(mean(t), sigma(t)) where t is the sample number. In control
 * means BOTH the mean and the variability are stationary, whatever σ is.
 * Out-of-control variants: the mean drifts up or down by `strength` oz per
 * sample, the mean follows a sine with amplitude 4×`strength` and period 8,
 * or σ grows by `strength`×100 % of its base value per sample.
 */

export const TARGET_MEAN = 12
export const SEASON_PERIOD = 8
export const MIN_N = 2
export const MAX_N = 10
export const SHELF_SIZE = 24
/** fewest boxed samples before the verdict is worth making */
export const MIN_SAMPLES_TO_JUDGE = 5

/** A₂, D₃, D₄ factors for 3-sigma limits, indexed by sample size n. */
export const FACTORS: Record<number, { A2: number; D3: number; D4: number }> = {
  2: { A2: 1.88, D3: 0, D4: 3.267 },
  3: { A2: 1.023, D3: 0, D4: 2.575 },
  4: { A2: 0.729, D3: 0, D4: 2.282 },
  5: { A2: 0.577, D3: 0, D4: 2.115 },
  6: { A2: 0.483, D3: 0, D4: 2.004 },
  7: { A2: 0.419, D3: 0.076, D4: 1.924 },
  8: { A2: 0.373, D3: 0.136, D4: 1.864 },
  9: { A2: 0.337, D3: 0.184, D4: 1.816 },
  10: { A2: 0.308, D3: 0.223, D4: 1.777 },
}

/** The 10 samples of 5 bottles from the Chapter 3 slides. */
export const CLASS_SAMPLES: number[][] = [
  [11.9, 11.92, 12.09, 11.91, 12.01],
  [12.03, 12.03, 11.92, 11.97, 12.07],
  [11.92, 12.02, 11.93, 12.01, 12.07],
  [11.96, 12.06, 12.0, 11.91, 11.98],
  [11.95, 12.1, 12.03, 12.07, 12.0],
  [11.99, 11.98, 11.94, 12.06, 12.06],
  [12.0, 12.04, 11.92, 12.0, 12.07],
  [12.02, 12.06, 11.94, 12.07, 12.0],
  [12.01, 12.06, 11.94, 11.91, 11.94],
  [11.92, 12.05, 11.92, 12.09, 12.07],
]

export type MeanPattern = 'stable' | 'up' | 'down' | 'seasonal'
export type VarPattern = 'stable' | 'increasing'

export interface Dgp {
  meanPattern: MeanPattern
  varPattern: VarPattern
  /** base standard deviation of one bottle's fill, oz */
  sigma: number
  /** oz per sample of drift; seasonal amplitude is 4× this */
  strength: number
  /**
   * the sample at which the pattern starts — flipping a pattern on
   * mid-run anchors here, so the process starts drifting NOW instead of
   * jumping by (t−1) samples' worth of accumulated drift
   */
  t0: number
}

/** The stable process behind the class data (R̄ = 0.15 ⇒ σ ≈ 0.06). */
export const CLASS_DGP: Dgp = {
  meanPattern: 'stable',
  varPattern: 'stable',
  sigma: 0.06,
  strength: 0.03,
  t0: 1,
}

export const inControl = (dgp: Dgp): boolean =>
  dgp.meanPattern === 'stable' && dgp.varPattern === 'stable'

/** the process mean when sample t (1-based) is drawn */
export function meanAt(dgp: Dgp, t: number): number {
  const k = Math.max(0, t - dgp.t0)
  switch (dgp.meanPattern) {
    case 'up':
      return TARGET_MEAN + dgp.strength * k
    case 'down':
      return TARGET_MEAN - dgp.strength * k
    case 'seasonal':
      return TARGET_MEAN + 4 * dgp.strength * Math.sin((2 * Math.PI * k) / SEASON_PERIOD)
    default:
      return TARGET_MEAN
  }
}

/** the process standard deviation when sample t (1-based) is drawn */
export function sigmaAt(dgp: Dgp, t: number): number {
  const k = Math.max(0, t - dgp.t0)
  return dgp.varPattern === 'increasing' ? dgp.sigma * (1 + dgp.strength * k) : dgp.sigma
}

/** one standard-normal draw (Box–Muller) */
function normal(): number {
  let u = 0
  while (u === 0) u = Math.random()
  const v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** a shelf of bottle fills for sample t, rounded to hundredths of an oz */
export function makeShelf(dgp: Dgp, t: number, size = SHELF_SIZE): number[] {
  const mu = meanAt(dgp, t)
  const sd = sigmaAt(dgp, t)
  return Array.from({ length: size }, () =>
    Math.max(0, Math.round((mu + sd * normal()) * 100) / 100),
  )
}

/**
 * A random practice problem: σ drawn from [0.04, 0.20]; in control half
 * the time, otherwise exactly one thing goes wrong — the mean drifts up,
 * drifts down, or cycles, or the variability grows.
 */
export function randomDgp(): Dgp {
  const sigma = Math.round((4 + Math.random() * 16)) / 100
  const strength = Math.round((2 + Math.random() * 6)) / 100
  if (Math.random() < 0.5) {
    return { meanPattern: 'stable', varPattern: 'stable', sigma, strength, t0: 1 }
  }
  const defect = Math.floor(Math.random() * 4)
  return {
    meanPattern: (['up', 'down', 'seasonal', 'stable'] as const)[defect],
    varPattern: defect === 3 ? 'increasing' : 'stable',
    sigma,
    strength,
    t0: 1,
  }
}

export interface Subgroup {
  /** stable key */
  id: string
  values: number[]
  mean: number
  range: number
}

export function makeSubgroup(id: string, values: number[]): Subgroup {
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const range = Math.max(...values) - Math.min(...values)
  return { id, values, mean, range }
}

export interface Limits {
  xbarbar: number
  rbar: number
  uclX: number
  lclX: number
  uclR: number
  lclR: number
}

export function limits(subgroups: Subgroup[], n: number): Limits | null {
  if (subgroups.length === 0) return null
  const f = FACTORS[n]
  const xbarbar = subgroups.reduce((s, g) => s + g.mean, 0) / subgroups.length
  const rbar = subgroups.reduce((s, g) => s + g.range, 0) / subgroups.length
  return {
    xbarbar,
    rbar,
    uclX: xbarbar + f.A2 * rbar,
    lclX: xbarbar - f.A2 * rbar,
    uclR: f.D4 * rbar,
    lclR: f.D3 * rbar,
  }
}

export interface Violation {
  /** 1-based sample number */
  sample: number
  chart: 'mean' | 'range'
  side: 'above' | 'below'
  /** distance beyond the limit as a fraction of that side's half-width */
  excess: number
}

/** points outside their control limits, on either chart */
export function violations(subgroups: Subgroup[], lim: Limits): Violation[] {
  const out: Violation[] = []
  subgroups.forEach((g, i) => {
    const halfX = lim.uclX - lim.xbarbar
    if (halfX > 0 && g.mean > lim.uclX)
      out.push({ sample: i + 1, chart: 'mean', side: 'above', excess: (g.mean - lim.uclX) / halfX })
    else if (halfX > 0 && g.mean < lim.lclX)
      out.push({ sample: i + 1, chart: 'mean', side: 'below', excess: (lim.lclX - g.mean) / halfX })
    const halfUp = lim.uclR - lim.rbar
    const halfDown = lim.rbar - lim.lclR
    if (halfUp > 0 && g.range > lim.uclR)
      out.push({ sample: i + 1, chart: 'range', side: 'above', excess: (g.range - lim.uclR) / halfUp })
    else if (halfDown > 0 && g.range < lim.lclR)
      out.push({ sample: i + 1, chart: 'range', side: 'below', excess: (lim.lclR - g.range) / halfDown })
  })
  return out
}

export type VerdictStatus = 'insufficient' | 'in-control' | 'questionable' | 'out'

export interface Verdict {
  status: VerdictStatus
  detail: string
}

/** a point just barely outside (≤ this excess) is "questionable", not damning */
const NEAR_LIMIT_EXCESS = 1 / 3

/**
 * The overall call, per the class convention: one point just outside the
 * limits is questionable; a second point outside, or a single point way
 * outside, means out of control.
 */
export function verdict(subgroups: Subgroup[], lim: Limits | null): Verdict {
  if (!lim || subgroups.length < MIN_SAMPLES_TO_JUDGE) {
    return {
      status: 'insufficient',
      detail: `Too early to call — box at least ${MIN_SAMPLES_TO_JUDGE} samples.`,
    }
  }
  const v = violations(subgroups, lim)
  if (v.length === 0) {
    return {
      status: 'in-control',
      detail: 'Every sample mean and range falls inside its control limits.',
    }
  }
  const what = (x: Violation) =>
    `sample ${x.sample}'s ${x.chart === 'mean' ? 'mean' : 'range'} is ${
      x.excess > NEAR_LIMIT_EXCESS ? 'far' : 'just'
    } ${x.side} the ${x.side === 'above' ? 'UCL' : 'LCL'}`
  if (v.length === 1 && v[0].excess <= NEAR_LIMIT_EXCESS) {
    return { status: 'questionable', detail: `${what(v[0])}.` }
  }
  if (v.length === 1) {
    return { status: 'out', detail: `${what(v[0])}.` }
  }
  return {
    status: 'out',
    detail: `${v.length} points fall outside the limits — first, ${what(v[0])}.`,
  }
}
