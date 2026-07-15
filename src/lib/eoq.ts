/**
 * Chapter 9 inventory management (EOQ) — pure computation, no React.
 *
 * Conventions match the Chapter 9 lecture exactly:
 * - The year has WORKING_DAYS = 250 working days (50 weeks × 5 days).
 * - Daily demand d = D / 250.
 * - EOQ: Q* = √(2DS / H).
 * - Orders per year = D / Q.
 * - Days between orders = Q / d — the slide convention (250 / (D/Q) is
 *   the same number, but the slides divide the order quantity by the
 *   daily demand).
 * - Reorder point ROP = d × lead time.
 * - Annual ordering cost = (D/Q)·S, annual holding cost = (Q/2)·H, and
 *   total annual cost is their sum.
 * - Class data (D = 1,000 units/yr, S = $200/order, H = $2.50/unit·yr,
 *   lead time 2 days): d = 4/day, Q* = 400 exactly, 2.5 orders/yr,
 *   100 days between orders, ROP = 8 units, and at Q* ordering = $500,
 *   holding = $500, total = $1,000.
 */

export const WORKING_DAYS = 250

export interface Scenario {
  /** annual demand, units/yr */
  D: number
  /** cost per order, $/order */
  S: number
  /** holding cost, $/unit·yr */
  H: number
  /** days between placing an order and receiving it */
  leadTime: number
}

/** The problem from the Chapter 9 slides. */
export const CLASS_SCENARIO: Scenario = { D: 1000, S: 200, H: 2.5, leadTime: 2 }

/** d = D / 250, units per working day. */
export const dailyDemand = (s: Scenario): number => s.D / WORKING_DAYS

/** Q* = √(2DS / H). */
export const qStar = (s: Scenario): number => Math.sqrt((2 * s.D * s.S) / s.H)

/** D / Q. */
export const ordersPerYear = (s: Scenario, Q: number): number => s.D / Q

/** Q / d — the slide convention (same value as 250 / (D/Q)). */
export const daysBetween = (s: Scenario, Q: number): number =>
  Q / dailyDemand(s)

/** ROP = d × lead time. */
export const reorderPoint = (s: Scenario): number =>
  dailyDemand(s) * s.leadTime

/** Annual ordering cost = (D/Q)·S. */
export const orderingCost = (s: Scenario, Q: number): number =>
  (s.D / Q) * s.S

/** Annual holding cost = (Q/2)·H. */
export const holdingCost = (s: Scenario, Q: number): number => (Q / 2) * s.H

/** Total annual cost = ordering + holding. */
export const totalCost = (s: Scenario, Q: number): number =>
  orderingCost(s, Q) + holdingCost(s, Q)

/**
 * Bounds for the student's chosen Q: roughly Q* / 8 up to 3·Q*, rounded to
 * a sensible increment so the endpoints read cleanly (class data: 50 to
 * 1,200 around Q* = 400).
 */
export function qRange(s: Scenario): { min: number; max: number } {
  const q = qStar(s)
  const round = q >= 800 ? 50 : q >= 160 ? 10 : q >= 40 ? 5 : 1
  const min = Math.max(1, Math.round(q / 8 / round) * round)
  const max = Math.max(min + round, Math.round((3 * q) / round) * round)
  return { min, max }
}

/**
 * A plausible random practice problem: D a multiple of 50 in [600, 12,000],
 * S a multiple of $5 in [$20, $300], H in [$0.50, $8.00] rounded to
 * quarters, lead time 1–5 days. Regenerates until the ROP sits below the
 * smallest chart Q (which also guarantees ROP < Q*), so the sawtooth's
 * order-at-ROP story holds at every chosen Q.
 */
export function randomScenario(): Scenario {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const s: Scenario = {
      D: 600 + 50 * Math.floor(Math.random() * 229),
      S: 20 + 5 * Math.floor(Math.random() * 57),
      H: 0.5 + 0.25 * Math.floor(Math.random() * 31),
      leadTime: 1 + Math.floor(Math.random() * 5),
    }
    if (reorderPoint(s) < qRange(s).min) return s
  }
  // practically unreachable — a known-good problem just in case
  return { D: 1000, S: 200, H: 2.5, leadTime: 1 }
}
