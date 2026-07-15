/**
 * Chapter 4 lean systems / value-stream mapping — pure computation, no React.
 *
 * Conventions match the Chapter 4 lecture exactly:
 * - Daily demand = weekly demand / 5 working days; daily availability =
 *   (shift hours − lunch hours) × 3,600 seconds.
 * - Takt = available seconds per day / daily demand — the beat the line
 *   must hold to keep up with the customer.
 * - Per-unit time at a step = cycle seconds + (setup minutes × 60) / batch
 *   size — setups are paid once per batch, so each piece carries a slice.
 * - The bottleneck is the step with the largest per-unit time; line
 *   capacity per day = available seconds / bottleneck per-unit time.
 * - Little's-law lead time of a buffer = WIP units / daily demand (days).
 *   Total lead time = raw-material days + every WIP buffer + finished
 *   goods; total processing time is just the sum of cycle seconds.
 * - Class data (Jensen Bearings): daily demand 640; availability 25,200 s;
 *   takt 39.375 s; per-unit 27 / 38.5 / 35 s → bottleneck Pierce & Form,
 *   capacity 654.5/day; lead segments 5 / 3.5 / 5.2 / 2.3 days → 16 days
 *   against 81 s of actual processing.
 */

export interface Step {
  /** stable key */
  id: string
  name: string
  /** processing time, seconds per unit */
  cycleSec: number
  /** setup time, minutes per batch */
  setupMin: number
  /** units of WIP waiting before this step — null for the first step,
   * whose incoming buffer is raw material (see rawMaterialDays) */
  wipBefore: number | null
}

export interface Scenario {
  steps: Step[]
  /** customer demand, units per week */
  weeklyDemand: number
  /** working days per week */
  daysPerWeek: 5
  /** hours per shift (one shift per day) */
  shiftHours: number
  /** unpaid lunch/break hours inside the shift */
  lunchHours: number
  /** units per batch (one setup per batch) */
  batchSize: number
  /** lead time of the raw-material buffer before the first step, days */
  rawMaterialDays: number
  /** finished units waiting to ship after the last step */
  wipAfterLast: number
}

/** The Jensen Bearings problem from the Chapter 4 slides. */
export const CLASS_SCENARIO: Scenario = {
  steps: [
    { id: 'press', name: 'Press', cycleSec: 12, setupMin: 10, wipBefore: null },
    { id: 'pierce', name: 'Pierce & Form', cycleSec: 34, setupMin: 3, wipBefore: 2250 },
    { id: 'grind', name: 'Finish Grind', cycleSec: 35, setupMin: 0, wipBefore: 3350 },
  ],
  weeklyDemand: 3200,
  daysPerWeek: 5,
  shiftHours: 8,
  lunchHours: 1,
  batchSize: 40,
  rawMaterialDays: 5,
  wipAfterLast: 1475,
}

/** units the customer pulls per working day */
export const dailyDemand = (sc: Scenario): number =>
  sc.weeklyDemand / sc.daysPerWeek

/** working seconds available per day */
export const dailyAvailSec = (sc: Scenario): number =>
  (sc.shiftHours - sc.lunchHours) * 3600

/** takt time — seconds available per unit demanded */
export const taktSec = (sc: Scenario): number =>
  dailyAvailSec(sc) / dailyDemand(sc)

/** seconds each unit spends at a step, setup slice included */
export const perUnitSec = (step: Step, batchSize: number): number =>
  step.cycleSec + (step.setupMin * 60) / batchSize

/** the step with the largest per-unit time (first wins a tie) */
export const bottleneck = (sc: Scenario): Step =>
  sc.steps.reduce((worst, s) =>
    perUnitSec(s, sc.batchSize) > perUnitSec(worst, sc.batchSize) ? s : worst,
  )

/** units per day the line can produce, paced by the bottleneck */
export const capacityPerDay = (sc: Scenario): number =>
  dailyAvailSec(sc) / perUnitSec(bottleneck(sc), sc.batchSize)

/** Little's law — days a buffer of `wip` units takes to drain */
export const leadDays = (sc: Scenario, wip: number): number =>
  wip / dailyDemand(sc)

/** every waiting segment along the stream, in flow order, days */
export const leadSegmentsDays = (sc: Scenario): number[] => [
  sc.rawMaterialDays,
  ...sc.steps.slice(1).map((s) => leadDays(sc, s.wipBefore ?? 0)),
  leadDays(sc, sc.wipAfterLast),
]

/** total lead time, days, exact (round the segments for display) */
export const totalLeadDays = (sc: Scenario): number =>
  leadSegmentsDays(sc).reduce((a, b) => a + b, 0)

/** total hands-on processing time, seconds */
export const totalProcessingSec = (sc: Scenario): number =>
  sc.steps.reduce((sum, s) => sum + s.cycleSec, 0)

const STEP_NAMES = [
  'Cut',
  'Press',
  'Weld',
  'Drill',
  'Grind',
  'Polish',
  'Assemble',
  'Pack',
] as const

const randInt = (lo: number, hi: number): number =>
  lo + Math.floor(Math.random() * (hi - lo + 1))

const pick = <T,>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)]

/**
 * A random practice problem: 3–4 steps with shop-floor names in plausible
 * routing order, whole-second cycles of 8–55 s, whole-minute setups of
 * 0–12 min with at least one step setup-free, batch from {20, 25, 40, 50},
 * an 8-hour shift with a half-hour or full-hour lunch, weekly demand a
 * multiple of 100 between 1,500 and 6,000, raw material 2–7 days, and WIP
 * buffers sized so each waits 0.5–8 days. Regenerates until the bottleneck
 * is not the first step (a quarter of the time first is allowed) and the
 * capacity-to-demand ratio lands in [0.85, 1.6], so sometimes the line
 * genuinely can't keep up.
 */
export function randomScenario(): Scenario {
  const allowFirst = Math.random() < 0.25
  for (let attempt = 0; attempt < 2000; attempt++) {
    const n = randInt(3, 4)
    // keep pool order so the routing reads like a real shop floor
    const names = [...STEP_NAMES]
      .map((name) => ({ name, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .slice(0, n)
      .map((x) => x.name)
      .sort((a, b) => STEP_NAMES.indexOf(a) - STEP_NAMES.indexOf(b))
    const batchSize = pick([20, 25, 40, 50] as const)
    const weeklyDemand = 100 * randInt(15, 60)
    const lunchHours = pick([0.5, 1] as const)
    const noSetupAt = randInt(0, n - 1)
    const sc: Scenario = {
      steps: names.map((name, i) => ({
        id: `r${i + 1}`,
        name,
        cycleSec: randInt(8, 55),
        setupMin: i === noSetupAt ? 0 : randInt(0, 12),
        wipBefore: i === 0 ? null : 0, // sized below once demand is known
      })),
      weeklyDemand,
      daysPerWeek: 5,
      shiftHours: 8,
      lunchHours,
      batchSize,
      rawMaterialDays: randInt(2, 7),
      wipAfterLast: 0,
    }
    const daily = dailyDemand(sc)
    // size each buffer so its lead time lands between 0.5 and 8 days
    const wipFor = () =>
      Math.max(25, Math.round((daily * (0.5 + Math.random() * 7.5)) / 25) * 25)
    for (const s of sc.steps.slice(1)) s.wipBefore = wipFor()
    sc.wipAfterLast = wipFor()

    const bn = sc.steps.indexOf(bottleneck(sc))
    const ratio = capacityPerDay(sc) / daily
    if ((allowFirst || bn !== 0) && ratio >= 0.85 && ratio <= 1.6) return sc
  }
  // practically unreachable
  return CLASS_SCENARIO
}
