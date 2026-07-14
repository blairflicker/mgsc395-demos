/**
 * Chapter 8 time-series forecasting — pure computation, no React.
 *
 * Conventions match the Chapter 8 lecture exactly:
 * - Naive: f_t = d_(t−1).
 * - Moving average MA(n): f_t = (d_(t−1) + d_(t−2) + … + d_(t−n)) / n.
 * - Exponential smoothing ES(α): f_2 = d_1, f_t = α·d_(t−1) + (1−α)·f_(t−1);
 *   the class example uses α = 0.7.
 * - Linear regression: the least-squares line f_t = b·t + a through the
 *   demand data (class data: f_t = 62.7·t + 34.4).
 * - Error in period t: E_t = f_t − d_t. MAD, MSE, and MAPE average the
 *   error terms over exactly the periods where the method has a forecast
 *   (naive and ES have T−1 terms, MA(n) has T−n, regression has all T).
 *   On the class data the naive forecast gives MAD 428.2, MSE 268,391,
 *   and MAPE 136%.
 *
 * Every forecast array is indexed so forecasts[t−1] = f_t for t = 1..T+1 —
 * one period past the data, which is the next-period forecast.
 */

/** The demand series from the Chapter 8 slides. */
export const CLASS_DEMAND: number[] = [
  120, 150, 240, 540, 210, 380, 120, 870, 120, 1100, 500, 950,
]

export const MIN_PERIODS = 4
export const MAX_PERIODS = 24
export const MIN_MA_N = 2
export const MAX_MA_N = 6
export const MIN_ALPHA = 0.05
export const MAX_ALPHA = 0.95

/** f_t = d_(t−1); undefined for period 1. */
export function naiveForecast(demand: number[]): (number | null)[] {
  const out: (number | null)[] = []
  for (let t = 1; t <= demand.length + 1; t++) {
    out.push(t >= 2 ? demand[t - 2] : null)
  }
  return out
}

/** f_t = mean of the n most recent demands; undefined for periods 1..n. */
export function movingAverageForecast(
  demand: number[],
  n: number,
): (number | null)[] {
  const out: (number | null)[] = []
  for (let t = 1; t <= demand.length + 1; t++) {
    if (t <= n) {
      out.push(null)
      continue
    }
    let sum = 0
    for (let k = t - n; k <= t - 1; k++) sum += demand[k - 1]
    out.push(sum / n)
  }
  return out
}

/** f_2 = d_1, then f_t = α·d_(t−1) + (1−α)·f_(t−1); undefined for period 1. */
export function expSmoothingForecast(
  demand: number[],
  alpha: number,
): (number | null)[] {
  if (demand.length === 0) return [null]
  const out: (number | null)[] = [null, demand[0]]
  let f = demand[0]
  for (let t = 3; t <= demand.length + 1; t++) {
    f = alpha * demand[t - 2] + (1 - alpha) * f
    out.push(f)
  }
  return out
}

export interface RegressionFit {
  /** b in f_t = b·t + a */
  slope: number
  /** a in f_t = b·t + a */
  intercept: number
}

/** Least-squares line through (t, d_t) for t = 1..T; null when T < 2. */
export function regressionFit(demand: number[]): RegressionFit | null {
  const T = demand.length
  if (T < 2) return null
  const meanT = (T + 1) / 2
  const meanD = demand.reduce((s, d) => s + d, 0) / T
  let sxx = 0
  let sxy = 0
  for (let t = 1; t <= T; t++) {
    sxx += (t - meanT) * (t - meanT)
    sxy += (t - meanT) * (demand[t - 1] - meanD)
  }
  if (sxx === 0) return null
  const slope = sxy / sxx
  return { slope, intercept: meanD - slope * meanT }
}

/** f_t = b·t + a for every period 1..T+1 (all null when no fit exists). */
export function regressionForecast(demand: number[]): (number | null)[] {
  const fit = regressionFit(demand)
  return Array.from({ length: demand.length + 1 }, (_, i) =>
    fit ? fit.slope * (i + 1) + fit.intercept : null,
  )
}

export interface ErrorRow {
  period: number
  forecast: number
  demand: number
  /** |E_t| = |f_t − d_t| */
  absError: number
  /** E_t² */
  sqError: number
  /** |E_t| / d_t, or null when d_t = 0 */
  pctError: number | null
}

/** One row per period 1..T where the method has a forecast. */
export function errorRows(
  demand: number[],
  forecasts: (number | null)[],
): ErrorRow[] {
  const out: ErrorRow[] = []
  for (let t = 1; t <= demand.length; t++) {
    const f = forecasts[t - 1]
    if (f === null || f === undefined) continue
    const d = demand[t - 1]
    const e = f - d
    out.push({
      period: t,
      forecast: f,
      demand: d,
      absError: Math.abs(e),
      sqError: e * e,
      pctError: d !== 0 ? Math.abs(e) / d : null,
    })
  }
  return out
}

export interface Metrics {
  mad: number
  mse: number
  /** in percent (136.4 means 136.4%), or null when every d_t was 0 */
  mape: number | null
  /** how many error terms the averages run over */
  count: number
}

/** The class convention: divide by the number of periods that have a forecast. */
export function metricsFrom(rows: ErrorRow[]): Metrics | null {
  if (rows.length === 0) return null
  const count = rows.length
  const mad = rows.reduce((s, r) => s + r.absError, 0) / count
  const mse = rows.reduce((s, r) => s + r.sqError, 0) / count
  const pctRows = rows.filter((r) => r.pctError !== null)
  const mape =
    pctRows.length > 0
      ? (pctRows.reduce((s, r) => s + (r.pctError ?? 0), 0) / pctRows.length) * 100
      : null
  return { mad, mse, mape, count }
}

/**
 * A random practice problem: 10–14 periods with a random level, a trend
 * that never drags the series negative, and noise — rounded to tens.
 */
export function randomDemand(): number[] {
  const T = 10 + Math.floor(Math.random() * 5)
  const level = 200 + Math.random() * 500
  const maxDown = Math.min(60, (level - 100) / T)
  const trend = -maxDown + Math.random() * (maxDown + 60)
  const noise = level * (0.15 + Math.random() * 0.35)
  const out: number[] = []
  for (let t = 0; t < T; t++) {
    const v = level + trend * t + (Math.random() * 2 - 1) * noise
    out.push(Math.max(10, Math.round(v / 10) * 10))
  }
  return out
}
