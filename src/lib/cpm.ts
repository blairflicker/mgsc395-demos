/**
 * Critical Path Method (CPM) scheduling — pure computation, no React.
 *
 * Conventions match the Chapter 7 lecture exactly:
 * - Forward pass (the "forward game"): EST = 0 for activities with no
 *   predecessors; otherwise EST is the MAX of all predecessors' EFTs
 *   (every predecessor must finish first). EFT = EST + Estimated Time.
 * - Backward pass (the "backward game"): LFT = project duration for
 *   activities with no successors; otherwise LFT is the MIN of all
 *   successors' LSTs. LST = LFT − Estimated Time.
 * - Slack = LFT − EFT (equivalently LST − EST). Critical ⇔ slack = 0.
 */

export interface ActivityInput {
  /** single-letter id, e.g. "A" */
  id: string
  /** description straight from the slides */
  name: string
  /** immediate predecessors (empty ⇒ the activity follows Start) */
  predecessors: string[]
  /** estimated time, weeks */
  duration: number
}

export interface ScheduledActivity extends ActivityInput {
  successors: string[]
  /** Earliest Start Time */
  est: number
  /** Earliest Finish Time */
  eft: number
  /** Latest Start Time */
  lst: number
  /** Latest Finish Time */
  lft: number
  /** LFT − EFT */
  slack: number
  critical: boolean
}

export interface ProjectPath {
  /** activity ids in order, from a Start activity to a Finish activity */
  ids: string[]
  /** sum of activity times along the path, weeks */
  duration: number
  /** true when this path's time equals the project duration */
  critical: boolean
}

export interface CpmSchedule {
  /** all activities, in input order */
  activities: ScheduledActivity[]
  byId: Record<string, ScheduledActivity>
  /** weeks — the length of the longest (critical) path */
  projectDuration: number
  /** ids with zero slack, in input order */
  criticalIds: string[]
  /** every Start → Finish path */
  paths: ProjectPath[]
  /** the paths whose time equals the project duration */
  criticalPaths: ProjectPath[]
}

const EPS = 1e-9

export function computeCpm(inputs: ActivityInput[]): CpmSchedule {
  const byId: Record<string, ScheduledActivity> = {}
  for (const a of inputs) {
    if (byId[a.id]) throw new Error(`duplicate activity id "${a.id}"`)
    byId[a.id] = {
      ...a,
      predecessors: [...a.predecessors],
      successors: [],
      est: 0,
      eft: 0,
      lst: 0,
      lft: 0,
      slack: 0,
      critical: false,
    }
  }
  const activities = inputs.map((a) => byId[a.id])
  for (const a of activities) {
    for (const p of a.predecessors) {
      if (!byId[p]) throw new Error(`activity "${a.id}" lists unknown predecessor "${p}"`)
      byId[p].successors.push(a.id)
    }
  }

  // Topological order (Kahn's algorithm)
  const remaining: Record<string, number> = {}
  for (const a of activities) remaining[a.id] = a.predecessors.length
  const order: ScheduledActivity[] = []
  const ready = activities.filter((a) => remaining[a.id] === 0)
  while (ready.length > 0) {
    const a = ready.shift()!
    order.push(a)
    for (const s of a.successors) {
      remaining[s] -= 1
      if (remaining[s] === 0) ready.push(byId[s])
    }
  }
  if (order.length !== activities.length) {
    throw new Error('precedence relationships contain a cycle')
  }

  // Forward game: Earliest Finish = Earliest Start + Estimated Time,
  // where EST is the MAX of all predecessors' EFTs.
  for (const a of order) {
    a.est =
      a.predecessors.length > 0
        ? Math.max(...a.predecessors.map((p) => byId[p].eft))
        : 0
    a.eft = a.est + a.duration
  }
  const projectDuration = activities.reduce((m, a) => Math.max(m, a.eft), 0)

  // Backward game: Latest Start = Latest Finish − Estimated Time,
  // where LFT is the MIN of all successors' LSTs.
  for (let i = order.length - 1; i >= 0; i--) {
    const a = order[i]
    a.lft =
      a.successors.length > 0
        ? Math.min(...a.successors.map((s) => byId[s].lst))
        : projectDuration
    a.lst = a.lft - a.duration
    a.slack = a.lft - a.eft
    a.critical = Math.abs(a.slack) < EPS
  }

  // Enumerate every Start → Finish path (the graph is small).
  const paths: ProjectPath[] = []
  const walk = (a: ScheduledActivity, trail: string[], time: number) => {
    const ids = [...trail, a.id]
    const duration = time + a.duration
    if (a.successors.length === 0) {
      paths.push({ ids, duration, critical: Math.abs(duration - projectDuration) < EPS })
    } else {
      for (const s of a.successors) walk(byId[s], ids, duration)
    }
  }
  for (const a of activities) {
    if (a.predecessors.length === 0) walk(a, [], 0)
  }

  return {
    activities,
    byId,
    projectDuration,
    criticalIds: activities.filter((a) => a.critical).map((a) => a.id),
    paths,
    criticalPaths: paths.filter((p) => p.critical),
  }
}

/**
 * The St. John's Hospital project from the Chapter 7 slides.
 * At these estimated times the critical path is B-D-H-J-K, 69 weeks.
 */
export const ST_JOHNS: ActivityInput[] = [
  { id: 'A', name: 'Select administrative staff', predecessors: [], duration: 12 },
  { id: 'B', name: 'Select site and survey', predecessors: [], duration: 9 },
  { id: 'C', name: 'Select medical equipment', predecessors: ['A'], duration: 10 },
  { id: 'D', name: 'Prepare final construction plans', predecessors: ['B'], duration: 10 },
  { id: 'E', name: 'Bring utilities to site', predecessors: ['B'], duration: 24 },
  { id: 'F', name: 'Interview applicants for nursing and support staff', predecessors: ['A'], duration: 10 },
  { id: 'G', name: 'Purchase and deliver equipment', predecessors: ['C'], duration: 35 },
  { id: 'H', name: 'Construct hospital', predecessors: ['D'], duration: 40 },
  { id: 'I', name: 'Develop information system', predecessors: ['A'], duration: 15 },
  { id: 'J', name: 'Install medical equipment', predecessors: ['E', 'G', 'H'], duration: 4 },
  { id: 'K', name: 'Train nurses and support staff', predecessors: ['F', 'I', 'J'], duration: 6 },
]

/** Default estimated times, keyed by activity id. */
export const DEFAULT_DURATIONS: Record<string, number> = Object.fromEntries(
  ST_JOHNS.map((a) => [a.id, a.duration]),
)

/** One crashing opportunity from the slides' cost-time trade-off example. */
export interface CrashOption {
  /** id of the activity that can be crashed */
  id: string
  /** normal time (NT), weeks */
  normalTime: number
  /** normal cost (NC), dollars */
  normalCost: number
  /** crash time (CT) — the shortest possible time, weeks */
  crashTime: number
  /** crash cost (CC), dollars */
  crashCost: number
}

/** The two crashing opportunities considered in class. */
export const CRASH_OPTIONS: CrashOption[] = [
  { id: 'D', normalTime: 10, normalCost: 50_000, crashTime: 8, crashCost: 150_000 },
  { id: 'F', normalTime: 10, normalCost: 100_000, crashTime: 1, crashCost: 101_000 },
]
