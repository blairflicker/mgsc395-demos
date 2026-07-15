/**
 * Chapter 12 inventory metrics — pure computation, no React.
 *
 * Conventions match the Chapter 12 lecture exactly:
 * - Average aggregate inventory value: AAIV = Σ units on hand × value per unit.
 * - Weeks of supply = AAIV / weekly sales at cost, where weekly sales at
 *   cost = annual sales at cost (COGS) / 52.
 * - Inventory turnover = annual sales at cost (COGS) / AAIV, in turns/yr.
 * - Class example (Eagle Machine, COGS $10,000,000): AAIV = $2,000,000,
 *   weeks of supply = 10.4, turnover = 5.0 turns/yr. The comparison firm
 *   (Falcon Machine, same catalog and COGS but leaner): AAIV = $1,250,000,
 *   weeks of supply = 6.5, turnover = 8.0 turns/yr.
 */

export const WEEKS_PER_YEAR = 52

export interface InventoryItem {
  /** stable row key, never shown */
  id: string
  name: string
  /** average units on hand */
  units: number
  /** value per unit, $ */
  value: number
}

export interface Company {
  name: string
  /** annual sales at cost (COGS), $ */
  cogs: number
  items: InventoryItem[]
}

/** Average aggregate inventory value = Σ units × value per unit. */
export function aaiv(items: InventoryItem[]): number {
  return items.reduce((sum, it) => sum + it.units * it.value, 0)
}

/** AAIV / weekly sales at cost (COGS / 52); null when COGS isn't positive. */
export function weeksOfSupply(aaiv: number, cogs: number): number | null {
  return cogs > 0 ? aaiv / (cogs / WEEKS_PER_YEAR) : null
}

/** Annual sales at cost (COGS) / AAIV; null when AAIV isn't positive. */
export function turnover(aaiv: number, cogs: number): number | null {
  return aaiv > 0 ? cogs / aaiv : null
}

/** The two companies from the Chapter 12 slides' comparison. */
export const CLASS_COMPANIES: [Company, Company] = [
  {
    name: 'Eagle Machine',
    cogs: 10_000_000,
    items: [
      { id: 'e1', name: 'A', units: 1_000, value: 350 },
      { id: 'e2', name: 'B', units: 2_000, value: 100 },
      { id: 'e3', name: 'C', units: 3_000, value: 200 },
      { id: 'e4', name: 'D', units: 4_000, value: 150 },
      { id: 'e5', name: 'E', units: 5_000, value: 50 },
    ],
  },
  {
    name: 'Falcon Machine',
    cogs: 10_000_000,
    items: [
      { id: 'f1', name: 'A', units: 500, value: 350 },
      { id: 'f2', name: 'B', units: 1_000, value: 100 },
      { id: 'f3', name: 'C', units: 1_500, value: 200 },
      { id: 'f4', name: 'D', units: 2_500, value: 150 },
      { id: 'f5', name: 'E', units: 6_000, value: 50 },
    ],
  },
]

const RANDOM_NAMES = [
  'Hawk Machine',
  'Osprey Machine',
  'Condor Machine',
  'Kestrel Machine',
  'Raven Machine',
  'Heron Machine',
] as const

/** random units on hand, 50–5,000 rounded to tens */
const randomUnits = (): number => Math.round((50 + Math.random() * 4_950) / 10) * 10

/** random annual COGS, $2M–$20M rounded to $100k */
const randomCogs = (): number =>
  Math.round((2_000_000 + Math.random() * 18_000_000) / 100_000) * 100_000

/**
 * A random practice problem: two companies sharing one 5–8-item catalog
 * (same item names and per-unit values, $10–$400 per unit) but holding
 * different unit counts, each with its own round-number COGS. Regenerates
 * until both weeks-of-supply land in a plausible 2–60 range.
 */
export function randomCompanies(): [Company, Company] {
  for (let attempt = 0; attempt < 500; attempt++) {
    const n = 5 + Math.floor(Math.random() * 4)
    const catalog = Array.from({ length: n }, (_, i) => ({
      name: String.fromCharCode(65 + i),
      value: Math.round(10 + Math.random() * 390),
    }))
    const nameA = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]
    let nameB = nameA
    while (nameB === nameA)
      nameB = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]
    const build = (name: string, prefix: string): Company => ({
      name,
      cogs: randomCogs(),
      items: catalog.map((c, i) => ({
        id: `${prefix}${i + 1}`,
        name: c.name,
        units: randomUnits(),
        value: c.value,
      })),
    })
    const pair: [Company, Company] = [build(nameA, 'ra'), build(nameB, 'rb')]
    const plausible = pair.every((co) => {
      const w = weeksOfSupply(aaiv(co.items), co.cogs)
      return w !== null && w >= 2 && w <= 60
    })
    if (plausible) return pair
  }
  // practically unreachable — fall back to the class problem
  return [
    { ...CLASS_COMPANIES[0], items: CLASS_COMPANIES[0].items.map((it) => ({ ...it })) },
    { ...CLASS_COMPANIES[1], items: CLASS_COMPANIES[1].items.map((it) => ({ ...it })) },
  ]
}
