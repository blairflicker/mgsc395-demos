/**
 * Chapter 5 long-term capacity planning — pure computation, no React.
 *
 * Conventions match the Chapter 5 lecture exactly:
 * - Each machine supplies N = days × shift hours per year; a target
 *   capacity cushion of C percent reserves N·C/100 of those hours, leaving
 *   N·(1 − C/100) that can be counted on.
 * - Per product: processing hours = D·p; with setups, lots = D/Q and
 *   setup hours = (D/Q)·s. The simple (single-product, no-setup) formula
 *   is the same computation with the setup term absent.
 * - M = total hours / (N·(1 − C/100)) — machines required, usually
 *   fractional; round up if the cushion must be maintained.
 * - Class data (the copy center): Client X 1,000 + 25 = 1,025 h,
 *   Client Y 4,200 + 80 = 4,280 h, total 5,305 h; N = 250 × 8 = 2,000,
 *   reserved 300, dependable 1,700; M = 3.12 → 4 machines.
 */

export interface ProductLoad {
  /** stable key */
  id: string
  name: string
  /** annual demand, units */
  D: number
  /** processing time, hours per unit */
  p: number
  /** lot size, units per lot — null when setups don't apply */
  Q: number | null
  /** setup time, hours per lot — null when setups don't apply */
  s: number | null
}

export interface CapacityCase {
  products: ProductLoad[]
  /** operating days per year */
  days: number
  /** shift hours per day */
  hoursPerDay: number
  /** target capacity cushion, percent */
  cushion: number
}

/** The copy-center problem from the Chapter 5 slides. */
export const CLASS_CASE: CapacityCase = {
  products: [
    { id: 'x', name: 'Client X', D: 2000, p: 0.5, Q: 20, s: 0.25 },
    { id: 'y', name: 'Client Y', D: 6000, p: 0.7, Q: 30, s: 0.4 },
  ],
  days: 250,
  hoursPerDay: 8,
  cushion: 15,
}

export const processingHours = (pl: ProductLoad): number => pl.D * pl.p

export const lotCount = (pl: ProductLoad): number =>
  pl.Q !== null && pl.Q > 0 ? pl.D / pl.Q : 0

export const setupHours = (pl: ProductLoad): number =>
  pl.s !== null ? lotCount(pl) * pl.s : 0

export const productHours = (pl: ProductLoad): number =>
  processingHours(pl) + setupHours(pl)

export const totalHours = (c: CapacityCase): number =>
  c.products.reduce((sum, pl) => sum + productHours(pl), 0)

/** N — hours each machine supplies per year */
export const hoursPerMachine = (c: CapacityCase): number =>
  c.days * c.hoursPerDay

/** hours per machine set aside for the cushion */
export const reservedHours = (c: CapacityCase): number =>
  hoursPerMachine(c) * (c.cushion / 100)

/** hours per machine that can be counted on */
export const dependableHours = (c: CapacityCase): number =>
  hoursPerMachine(c) - reservedHours(c)

/** M — machines required (fractional) */
export const machinesRequired = (c: CapacityCase): number =>
  totalHours(c) / dependableHours(c)

/** utilization in percent if k machines are bought (can exceed 100) */
export const utilizationAt = (c: CapacityCase, k: number): number =>
  (totalHours(c) / (k * hoursPerMachine(c))) * 100

/** effective cushion in percent if k machines are bought (can be negative) */
export const effectiveCushionAt = (c: CapacityCase, k: number): number =>
  100 - utilizationAt(c, k)

/** hours that simply don't fit if k machines are bought */
export const deficitAt = (c: CapacityCase, k: number): number =>
  Math.max(0, totalHours(c) - k * hoursPerMachine(c))

const NAMES = ['Client A', 'Client B', 'Client C'] as const

/**
 * A random practice problem: half the time a single product with no
 * setups (the simple formula), otherwise 2–3 products with lot sizes and
 * setup times (the complicated formula). Demands are multiples of the lot
 * size so lot counts come out whole. Regenerates until M lands between
 * 1.1 and 8.5 machines and isn't already almost an integer.
 */
export function randomCase(): CapacityCase {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const cushion = 5 * (1 + Math.floor(Math.random() * 8))
    const hoursPerDay = Math.random() < 0.25 ? 16 : 8
    const single = Math.random() < 0.5
    const products: ProductLoad[] = single
      ? [
          {
            id: 'r1',
            name: NAMES[0],
            D: 100 * (10 + Math.floor(Math.random() * 190)),
            p: 0.05 * (1 + Math.floor(Math.random() * 12)),
            Q: null,
            s: null,
          },
        ]
      : Array.from({ length: 2 + Math.floor(Math.random() * 2) }, (_, i) => {
          const Q = [10, 20, 25, 40, 50][Math.floor(Math.random() * 5)]
          return {
            id: `r${i + 1}`,
            name: NAMES[i],
            D: Q * (20 + Math.floor(Math.random() * 180)),
            p: 0.05 * (2 + Math.floor(Math.random() * 14)),
            Q,
            s: 0.05 * (2 + Math.floor(Math.random() * 17)),
          }
        })
    const c: CapacityCase = { products, days: 250, hoursPerDay, cushion }
    const m = machinesRequired(c)
    const frac = m - Math.floor(m)
    if (m >= 1.1 && m <= 8.5 && frac > 0.08 && frac < 0.92) return c
  }
  // practically unreachable
  return {
    products: [{ id: 'r1', name: NAMES[0], D: 4000, p: 0.5, Q: null, s: null }],
    days: 250,
    hoursPerDay: 8,
    cushion: 20,
  }
}
