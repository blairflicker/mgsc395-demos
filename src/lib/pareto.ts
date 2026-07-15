/**
 * Chapter 2 process analysis — Pareto charts. Pure computation, no React.
 *
 * Conventions match the Chapter 2 lecture exactly:
 * - Categories are tallied in the order the survey collected them; the
 *   Pareto view re-sorts them by count, largest first.
 * - percent = count / total; the cumulative percent runs down the sorted
 *   order, reaching 100% at the last category.
 * - Class data (the restaurant survey, in collected order): Discourteous
 *   service 12, Slow service 42, Cold dinner 5, Cramped tables 20,
 *   Atmosphere 10 — 89 complaints in all. Sorted: Slow service 47.2%,
 *   Cramped tables 22.5% (cum 69.7%), Discourteous service 13.5%
 *   (cum 83.1%), Atmosphere 11.2% (cum 94.4%), Cold dinner 5.6% (cum 100%).
 */

export interface Category {
  /** stable key */
  id: string
  name: string
  /** tally for this category */
  count: number
}

export interface ParetoScenario {
  /** what one tally mark is — 'complaints', 'returns', 'tickets' */
  unit: string
  /** categories in the order they were collected */
  categories: Category[]
}

/** The restaurant complaint survey from the Chapter 2 slides. */
export const CLASS_CATEGORIES: Category[] = [
  { id: 'discourteous', name: 'Discourteous service', count: 12 },
  { id: 'slow', name: 'Slow service', count: 42 },
  { id: 'cold', name: 'Cold dinner', count: 5 },
  { id: 'cramped', name: 'Cramped tables', count: 20 },
  { id: 'atmosphere', name: 'Atmosphere', count: 10 },
]

export const CLASS_SCENARIO: ParetoScenario = {
  unit: 'complaints',
  categories: CLASS_CATEGORIES,
}

export const totalCount = (categories: Category[]): number =>
  categories.reduce((sum, c) => sum + c.count, 0)

/** categories re-sorted by count, largest first */
export const sorted = (categories: Category[]): Category[] =>
  [...categories].sort((a, b) => b.count - a.count)

export interface ParetoRow {
  category: Category
  /** count / total, as a fraction */
  percent: number
  /** running count down the sorted order */
  cumulativeCount: number
  /** running fraction down the sorted order (1 at the last row) */
  cumulativePercent: number
}

/** the worked Pareto table: sorted order with percents and cumulatives */
export function paretoRows(categories: Category[]): ParetoRow[] {
  const total = totalCount(categories)
  let running = 0
  return sorted(categories).map((category) => {
    running += category.count
    return {
      category,
      percent: category.count / total,
      cumulativeCount: running,
      cumulativePercent: running / total,
    }
  })
}

interface ThemePool {
  unit: string
  names: readonly string[]
}

const POOLS: readonly ThemePool[] = [
  {
    unit: 'complaints',
    names: [
      'Slow service',
      'Cold food',
      'Wrong order delivered',
      'Rude staff',
      'Long wait for a table',
      'Noisy dining room',
      'Dirty silverware',
      'Small portions',
      'Overpriced menu',
    ],
  },
  {
    unit: 'returns',
    names: [
      'Wrong size',
      'Damaged in shipping',
      'Not as pictured',
      'Changed mind',
      'Missing parts',
      'Arrived too late',
      'Poor quality',
      'Wrong item shipped',
      'Duplicate order',
    ],
  },
  {
    unit: 'tickets',
    names: [
      'Password reset',
      'Printer offline',
      'Wireless dropouts',
      'Software install request',
      'Email not syncing',
      'Remote VPN access',
      'Slow laptop',
      'Monitor flicker',
      'Account lockout',
    ],
  },
]

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * A random practice problem: one theme (restaurant complaints, retail
 * returns, or help-desk tickets), 5–7 categories, counts drawn from a
 * rough power law so the top one or two clearly dominate, scaled to a
 * total of roughly 60–400 with every count at least 2, then shuffled
 * into a "collected" display order. Regenerates until the top two
 * categories carry over half the total and don't tie.
 */
export function randomCategories(): ParetoScenario {
  const pool = POOLS[Math.floor(Math.random() * POOLS.length)]
  for (let attempt = 0; attempt < 500; attempt++) {
    const k = 5 + Math.floor(Math.random() * 3)
    const names = shuffle([...pool.names]).slice(0, k)
    const alpha = 1.2 + Math.random() * 0.8
    const weights = names
      .map((_, i) => Math.pow(i + 1, -alpha) * (0.75 + Math.random() * 0.5))
      .sort((a, b) => b - a)
    const weightSum = weights.reduce((s, w) => s + w, 0)
    const target = 60 + Math.floor(Math.random() * 341)
    const counts = weights.map((w) =>
      Math.max(2, Math.round((w / weightSum) * target)),
    )
    const total = counts.reduce((s, c) => s + c, 0)
    const ranked = [...counts].sort((a, b) => b - a)
    if (ranked[0] === ranked[1]) continue // a tie at the top muddies the sort
    if ((ranked[0] + ranked[1]) / total < 0.55) continue // must clearly dominate
    const categories = shuffle(
      names.map((name, i) => ({ id: `r${i + 1}`, name, count: counts[i] })),
    )
    return { unit: pool.unit, categories }
  }
  // practically unreachable
  return CLASS_SCENARIO
}
