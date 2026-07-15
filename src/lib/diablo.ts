/**
 * Chapter 6 — the Diablo Electronics problem, pure computation, no React.
 *
 * Four products (A–D) are fabricated and assembled at five workstations,
 * each staffed by one worker (Victor, Wendy, Xavier, Yelena, Zayn) with
 * 2,400 minutes available per week (8 h/day × 5 days, no overtime).
 * Demand exceeds what the plant can make, so a product mix must be chosen.
 *
 * Numbers match the Chapter 6 lecture exactly:
 * - At full demand, Xavier's load is 2,600 min > 2,400 — the bottleneck.
 * - Traditional method (rank by unit margin, B A C D):
 *   60 A, 80 B, 40 C, 100 D → profit $1,560.
 * - Bottleneck method (rank by margin per minute at Xavier, D C A B):
 *   60 A, 70 B, 80 C, 100 D → profit $2,490.
 * - Profit = revenue − materials − labor ($18/h × 5 workers × 40 h = $3,600)
 *   − overhead ($8,500).
 */

export const PRODUCTS = ['A', 'B', 'C', 'D'] as const
export type ProductId = (typeof PRODUCTS)[number]

export const WORKERS = ['Victor', 'Wendy', 'Xavier', 'Yelena', 'Zayn'] as const
export type WorkerId = (typeof WORKERS)[number]

/** minutes per week each worker has available */
export const CAPACITY = 2400
/** 5 workers × 8 h/day × 5 days × $18/h — fixed, paid regardless of plan */
export const LABOR = 3600
/** fixed weekly overhead */
export const OVERHEAD = 8500

/** minutes of each worker's time one unit of each product needs */
export const TIME: Record<WorkerId, Record<ProductId, number>> = {
  Victor: { A: 30, B: 0, C: 0, D: 0 },
  Wendy: { A: 0, B: 0, C: 5, D: 15 },
  Xavier: { A: 10, B: 20, C: 5, D: 0 },
  Yelena: { A: 10, B: 10, C: 5, D: 5 },
  Zayn: { A: 0, B: 0, C: 5, D: 10 },
}

export interface ProductInfo {
  price: number
  materials: number
  /** contribution margin = price − materials */
  margin: number
  /** units per week the market will take */
  demand: number
}

export const PRODUCT_INFO: Record<ProductId, ProductInfo> = {
  A: { price: 75, materials: 10, margin: 65, demand: 60 },
  B: { price: 72, materials: 5, margin: 67, demand: 80 },
  C: { price: 45, materials: 5, margin: 40, demand: 80 },
  D: { price: 38, materials: 10, margin: 28, demand: 100 },
}

/** units of each product planned for the week */
export type Plan = Record<ProductId, number>

export const ZERO_PLAN: Plan = { A: 0, B: 0, C: 0, D: 0 }
export const FULL_DEMAND_PLAN: Plan = { A: 60, B: 80, C: 80, D: 100 }
/** rank by unit margin (B A C D), fill demand in that order */
export const TRADITIONAL_PLAN: Plan = { A: 60, B: 80, C: 40, D: 100 }
/** rank by margin per minute at the bottleneck (D C A B) */
export const BOTTLENECK_PLAN: Plan = { A: 60, B: 70, C: 80, D: 100 }

/** minutes of one worker's week each product consumes under the plan */
export function workerLoad(plan: Plan, w: WorkerId): Record<ProductId, number> {
  const out = {} as Record<ProductId, number>
  for (const p of PRODUCTS) out[p] = TIME[w][p] * plan[p]
  return out
}

export function workerTotal(plan: Plan, w: WorkerId): number {
  let sum = 0
  for (const p of PRODUCTS) sum += TIME[w][p] * plan[p]
  return sum
}

/**
 * The most units of product p the plan can hold — limited by its demand
 * and by every worker who touches it having only 2,400 minutes.
 */
export function maxFeasible(plan: Plan, p: ProductId): number {
  let cap = PRODUCT_INFO[p].demand
  for (const w of WORKERS) {
    const t = TIME[w][p]
    if (t <= 0) continue
    const usedByOthers = workerTotal(plan, w) - t * plan[p]
    cap = Math.min(cap, Math.floor((CAPACITY - usedByOthers) / t))
  }
  return Math.max(0, cap)
}

export interface Financials {
  revenue: number
  materials: number
  labor: number
  overhead: number
  profit: number
  units: number
}

export function financials(plan: Plan): Financials {
  let revenue = 0
  let materials = 0
  let units = 0
  for (const p of PRODUCTS) {
    revenue += PRODUCT_INFO[p].price * plan[p]
    materials += PRODUCT_INFO[p].materials * plan[p]
    units += plan[p]
  }
  return {
    revenue,
    materials,
    labor: LABOR,
    overhead: OVERHEAD,
    profit: revenue - materials - LABOR - OVERHEAD,
    units,
  }
}
