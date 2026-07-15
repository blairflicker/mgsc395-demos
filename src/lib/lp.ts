/**
 * Supplement D — the Diablo problem as a linear program, pure math, no React.
 *
 * Conventions:
 * - Decision variables A, B, C, D — units of each product made per week.
 * - Objective: maximize total contribution margin, max Σ mₚ·Xₚ. Pure
 *   margins only — no fixed labor or overhead here, unlike the Chapter 6
 *   P&L, so the class LP's objective values sit $12,100 above ch6 profits.
 * - Constraints: four demand caps Xₚ ≤ dₚ, five worker weeks
 *   Σ TIME[w][p]·Xₚ ≤ 2,400 minutes, and non-negativity Xₚ ≥ 0.
 * - The time matrix and the 2,400-minute capacity always come from
 *   diablo.ts; an LpProblem only varies the margins and demand caps.
 *
 * Targets on CLASS_LP (checked by a node script before every commit):
 * - solveLp(CLASS_LP) → plan (60, 70, 80, 100), value $14,590 — the
 *   Chapter 6 bottleneck plan.
 * - evaluate at the traditional plan (60, 80, 40, 100) → $13,660, all
 *   constraints satisfied, Xavier exactly at 2,400 / 2,400.
 *
 * solveLp is exact: with 4 variables and 13 constraints (9 inequalities +
 * 4 non-negativity), every vertex of the feasible region is the solution
 * of some 4×4 system of active constraints, so enumerating all
 * C(13,4) = 715 combinations, keeping the feasible solutions, and taking
 * the best is a complete search of the candidates for the optimum.
 */

import {
  CAPACITY,
  PRODUCTS,
  TIME,
  WORKERS,
  ZERO_PLAN,
  type Plan,
  type ProductId,
} from './diablo'

export interface LpProblem {
  /** objective coefficients — contribution margin, $ per unit */
  margins: Record<ProductId, number>
  /** demand caps — units per week */
  demands: Record<ProductId, number>
}

/** The Diablo problem exactly as the class formulates it. */
export const CLASS_LP: LpProblem = {
  margins: { A: 65, B: 67, C: 40, D: 28 },
  demands: { A: 60, B: 80, C: 80, D: 100 },
}

export interface ConstraintRow {
  id: string
  /** e.g. "demand" or "Xavier’s time" */
  label: string
  coeffs: Record<ProductId, number>
  rhs: number
}

export interface ConstraintCheck extends ConstraintRow {
  /** left-hand side at the plan */
  used: number
  satisfied: boolean
}

export interface Evaluation {
  /** objective value — total contribution margin */
  value: number
  constraints: ConstraintCheck[]
  feasible: boolean
  violations: number
}

/** All 9 inequality constraints: 4 demand rows (unit coefficients), then 5 worker rows. */
export function constraintRows(problem: LpProblem): ConstraintRow[] {
  const rows: ConstraintRow[] = PRODUCTS.map((p) => ({
    id: `demand-${p}`,
    label: 'demand',
    coeffs: { ...ZERO_PLAN, [p]: 1 },
    rhs: problem.demands[p],
  }))
  for (const w of WORKERS) {
    rows.push({
      id: `worker-${w}`,
      label: `${w}’s time`,
      coeffs: { ...TIME[w] },
      rhs: CAPACITY,
    })
  }
  return rows
}

const TOL = 1e-7

/** Objective value and a satisfied/violated check of every constraint at the plan. */
export function evaluate(problem: LpProblem, plan: Plan): Evaluation {
  const constraints: ConstraintCheck[] = constraintRows(problem).map((row) => {
    let used = 0
    for (const p of PRODUCTS) used += row.coeffs[p] * plan[p]
    return { ...row, used, satisfied: used <= row.rhs + TOL }
  })
  let value = 0
  for (const p of PRODUCTS) value += problem.margins[p] * plan[p]
  const violations = constraints.filter((c) => !c.satisfied).length
  return { value, constraints, feasible: violations === 0, violations }
}

/**
 * Solve one 4×4 linear system given as rows [c₁ c₂ c₃ c₄ | rhs] by
 * Gauss–Jordan elimination with partial pivoting; null when singular.
 */
function solveSquare(rows: readonly (readonly number[])[]): number[] | null {
  const m = rows.map((r) => r.slice())
  for (let col = 0; col < 4; col++) {
    let piv = col
    for (let r = col + 1; r < 4; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[piv][col])) piv = r
    }
    if (Math.abs(m[piv][col]) < 1e-9) return null
    ;[m[col], m[piv]] = [m[piv], m[col]]
    for (let r = 0; r < 4; r++) {
      if (r === col) continue
      const f = m[r][col] / m[col][col]
      if (f === 0) continue
      for (let k = col; k <= 4; k++) m[r][k] -= f * m[col][k]
    }
  }
  return m.map((row, i) => row[4] / row[i])
}

/** hide floating-point dust — vertices of this LP land on clean numbers */
const snap = (v: number): number =>
  Math.abs(v - Math.round(v)) < 1e-6 ? Math.round(v) : v

export interface LpSolution {
  plan: Plan
  value: number
}

/**
 * Exact optimum by brute-force vertex enumeration: try every combination
 * of 4 of the 13 constraints as an active set, solve the 4×4 system,
 * keep feasible solutions, return the best.
 */
export function solveLp(problem: LpProblem): LpSolution {
  const rows = constraintRows(problem)
  // every constraint as [c₁ c₂ c₃ c₄ | rhs]; non-negativity rows are Xₚ = 0
  const system: number[][] = rows.map((row) => [
    ...PRODUCTS.map((p) => row.coeffs[p]),
    row.rhs,
  ])
  for (let i = 0; i < 4; i++) {
    const nonneg = [0, 0, 0, 0, 0]
    nonneg[i] = 1
    system.push(nonneg)
  }

  const n = system.length // 13
  let bestX: number[] | null = null
  let bestValue = -Infinity
  for (let a = 0; a < n - 3; a++) {
    for (let b = a + 1; b < n - 2; b++) {
      for (let c = b + 1; c < n - 1; c++) {
        for (let d = c + 1; d < n; d++) {
          const x = solveSquare([system[a], system[b], system[c], system[d]])
          if (!x) continue
          if (x.some((v) => v < -TOL)) continue
          let feasible = true
          for (const row of rows) {
            let used = 0
            for (let i = 0; i < 4; i++) used += row.coeffs[PRODUCTS[i]] * x[i]
            if (used > row.rhs + TOL) {
              feasible = false
              break
            }
          }
          if (!feasible) continue
          let value = 0
          for (let i = 0; i < 4; i++) value += problem.margins[PRODUCTS[i]] * x[i]
          if (value > bestValue) {
            bestValue = value
            bestX = x
          }
        }
      }
    }
  }

  if (!bestX) return { plan: { ...ZERO_PLAN }, value: 0 } // unreachable: the origin is a vertex
  const plan = {
    A: snap(bestX[0]),
    B: snap(bestX[1]),
    C: snap(bestX[2]),
    D: snap(bestX[3]),
  }
  let value = 0
  for (const p of PRODUCTS) value += problem.margins[p] * plan[p]
  return { plan, value: snap(value) }
}

/**
 * The intuitive plan: rank products by unit margin and fill each to its
 * demand or to whatever whole number of units the workers' remaining
 * minutes allow — Chapter 6's traditional method, generalized.
 */
export function greedyPlan(problem: LpProblem): Plan {
  const order = [...PRODUCTS].sort((a, b) => problem.margins[b] - problem.margins[a])
  const plan: Plan = { ...ZERO_PLAN }
  const left: Record<string, number> = {}
  for (const w of WORKERS) left[w] = CAPACITY
  for (const p of order) {
    let q = problem.demands[p]
    for (const w of WORKERS) {
      const t = TIME[w][p]
      if (t > 0) q = Math.min(q, Math.floor(left[w] / t))
    }
    plan[p] = Math.max(0, q)
    for (const w of WORKERS) left[w] -= TIME[w][p] * plan[p]
  }
  return plan
}

/**
 * A random practice LP over the same time matrix: whole-dollar margins in
 * $15–$80 and demands in multiples of 10 in [40, 120]. Regenerates until
 * meeting full demand is infeasible (some worker week binds), the optimal
 * plan is whole units, and the optimum strictly beats the greedy
 * fill-by-margin plan somewhere — so the LP genuinely beats intuition.
 */
export function randomLp(): LpProblem {
  for (let attempt = 0; attempt < 5000; attempt++) {
    const margins = {} as Record<ProductId, number>
    const demands = {} as Record<ProductId, number>
    for (const p of PRODUCTS) {
      margins[p] = 15 + Math.floor(Math.random() * 66)
      demands[p] = 10 * (4 + Math.floor(Math.random() * 9))
    }
    const problem: LpProblem = { margins, demands }
    if (evaluate(problem, { ...demands }).feasible) continue
    const opt = solveLp(problem)
    if (PRODUCTS.some((p) => !Number.isInteger(opt.plan[p]))) continue
    const greedy = greedyPlan(problem)
    if (PRODUCTS.every((p) => opt.plan[p] === greedy[p])) continue
    if (opt.value <= evaluate(problem, greedy).value + 0.5) continue
    return problem
  }
  return CLASS_LP // practically unreachable
}
