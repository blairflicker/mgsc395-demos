/**
 * Center-of-gravity facility location — pure computation, no React.
 *
 * Conventions match the Chapter 13 lecture exactly:
 * - Center of gravity: x_CG = Σ(lᵢ·xᵢ)/Σlᵢ and y_CG = Σ(lᵢ·yᵢ)/Σlᵢ —
 *   a load-weighted average of the customer coordinates, computed
 *   separately for x and y.
 * - Rectilinear ("city blocks") distance d = |x₂−x₁| + |y₂−y₁|;
 *   Euclidean (straight line) distance d = √((x₂−x₁)² + (y₂−y₁)²).
 * - Load-distance score LD = Σ lᵢ·dᵢ. In class the CG is rounded to one
 *   decimal before scoring: the class data gives CG (12.4, 9.2) and a
 *   rectilinear LD score of 2,662,400.
 */

export interface Point {
  x: number
  y: number
}

export interface CustomerInput {
  /** stable row key, never shown */
  id: string
  /** e.g. "Akron, OH" */
  name: string
  x: number
  y: number
  /** tons shipped per year */
  load: number
}

export type DistanceMetric = 'rectilinear' | 'euclidean'

/** the coordinate grid "map" spans x 0–20, y 0–16 */
export const GRID_MAX_X = 20
export const GRID_MAX_Y = 16

/** The power-generator shipping example from the Chapter 13 slides:
 *  607,000 tons across eight customer locations. */
export const CLASS_CUSTOMERS: CustomerInput[] = [
  { id: 'three-rivers', name: 'Three Rivers, MI', x: 7, y: 13, load: 5_000 },
  { id: 'fort-wayne', name: 'Fort Wayne, IN', x: 8, y: 12, load: 92_000 },
  { id: 'columbus', name: 'Columbus, OH', x: 11, y: 10, load: 70_000 },
  { id: 'ashland', name: 'Ashland, KY', x: 11, y: 7, load: 35_000 },
  { id: 'kingsport', name: 'Kingsport, TN', x: 12, y: 4, load: 9_000 },
  { id: 'akron', name: 'Akron, OH', x: 13, y: 11, load: 227_000 },
  { id: 'wheeling', name: 'Wheeling, WV', x: 14, y: 10, load: 16_000 },
  { id: 'roanoke', name: 'Roanoke, VA', x: 15, y: 5, load: 153_000 },
]

export function round1(v: number): number {
  return Math.round(v * 10) / 10
}

export function totalLoad(customers: { load: number }[]): number {
  return customers.reduce((sum, c) => sum + c.load, 0)
}

/** Load-weighted average of the coordinates, or null when there is no load. */
export function centerOfGravity(customers: CustomerInput[]): Point | null {
  const total = totalLoad(customers)
  if (total <= 0) return null
  return {
    x: customers.reduce((sum, c) => sum + c.load * c.x, 0) / total,
    y: customers.reduce((sum, c) => sum + c.load * c.y, 0) / total,
  }
}

export function distance(metric: DistanceMetric, a: Point, b: Point): number {
  return metric === 'rectilinear'
    ? Math.abs(b.x - a.x) + Math.abs(b.y - a.y)
    : Math.hypot(b.x - a.x, b.y - a.y)
}

/** LD score = Σ (load × distance) from every customer to `at`. */
export function loadDistance(
  customers: CustomerInput[],
  at: Point,
  metric: DistanceMetric,
): number {
  return customers.reduce((sum, c) => sum + c.load * distance(metric, c, at), 0)
}

/** Next unused row id of the form c1, c2, … */
export function nextCustomerId(rows: { id: string }[]): string {
  const used = new Set(rows.map((r) => r.id))
  let k = 1
  while (used.has(`c${k}`)) k++
  return `c${k}`
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** loads offered by the random generator, in thousands of tons */
const LOAD_CHOICES = [
  5, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 75, 90, 110, 130, 150, 180, 220, 250,
]

/**
 * A random practice problem: 5–8 customers named A, B, C, … at distinct
 * whole-number coordinates on the grid, with loads in round thousands.
 */
export function randomCustomers(): CustomerInput[] {
  const n = 5 + Math.floor(Math.random() * 4)
  const used = new Set<string>()
  const out: CustomerInput[] = []
  for (let i = 0; i < n; i++) {
    let x = 0
    let y = 0
    let key = ''
    do {
      x = 2 + Math.floor(Math.random() * (GRID_MAX_X - 3))
      y = 2 + Math.floor(Math.random() * (GRID_MAX_Y - 3))
      key = `${x},${y}`
    } while (used.has(key))
    used.add(key)
    out.push({
      id: `r${i + 1}`,
      name: LETTERS[i],
      x,
      y,
      load: 1_000 * LOAD_CHOICES[Math.floor(Math.random() * LOAD_CHOICES.length)],
    })
  }
  return out
}

// ── Deciding between locations (Example 2) ─────────────────

export interface SiteInput {
  /** stable row key, never shown */
  id: string
  name: string
  /** annual fixed cost, $ */
  fixedCost: number
  /** variable cost per unit, $ */
  variableCost: number
  /** forecasted demand, units per year */
  demand: number
  /** selling price per unit, $ */
  price: number
}

export interface SiteFinancials {
  totalVariableCost: number
  totalCost: number
  totalRevenue: number
  profit: number
}

/** Columbia vs Atlanta from the Chapter 13 slides:
 *  profits $28,000,000 vs $29,000,000 — Atlanta wins. */
export const CLASS_SITES: SiteInput[] = [
  {
    id: 'columbia',
    name: 'Columbia, SC',
    fixedCost: 2_000_000,
    variableCost: 100,
    demand: 100_000,
    price: 400,
  },
  {
    id: 'atlanta',
    name: 'Atlanta, GA',
    fixedCost: 6_000_000,
    variableCost: 120,
    demand: 125_000,
    price: 400,
  },
]

/**
 * The class definitions: total variable costs = variable cost × demand,
 * total costs = fixed + variable, total revenue = price × demand,
 * profit = revenue − costs.
 */
export function siteFinancials(s: SiteInput): SiteFinancials {
  const totalVariableCost = s.variableCost * s.demand
  const totalCost = s.fixedCost + totalVariableCost
  const totalRevenue = s.price * s.demand
  return {
    totalVariableCost,
    totalCost,
    totalRevenue,
    profit: totalRevenue - totalCost,
  }
}

/** Next unused row id of the form s1, s2, … */
export function nextSiteId(rows: { id: string }[]): string {
  const used = new Set(rows.map((r) => r.id))
  let k = 1
  while (used.has(`s${k}`)) k++
  return `s${k}`
}
