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

/** Every id reachable downstream of `id` (used to forbid cyclic predecessor picks). */
export function descendantsOf(inputs: ActivityInput[], id: string): Set<string> {
  const successors: Record<string, string[]> = {}
  for (const a of inputs) {
    for (const p of a.predecessors) (successors[p] ??= []).push(a.id)
  }
  const out = new Set<string>()
  const stack = [id]
  while (stack.length > 0) {
    const current = stack.pop()!
    for (const s of successors[current] ?? []) {
      if (!out.has(s)) {
        out.add(s)
        stack.push(s)
      }
    }
  }
  return out
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** Next unused single-letter id, or null when all 26 are taken. */
export function nextActivityId(inputs: ActivityInput[]): string | null {
  const used = new Set(inputs.map((a) => a.id))
  for (const ch of LETTERS) if (!used.has(ch)) return ch
  return null
}

/**
 * A random practice project: 7–9 activities in 3–4 precedence layers,
 * each later activity following one or two earlier ones. Always a DAG,
 * letters always in topological order (like the textbook's problems).
 */
export function randomProject(): ActivityInput[] {
  const n = 7 + Math.floor(Math.random() * 3)
  const nLayers = 3 + Math.floor(Math.random() * 2)
  const layerOf: number[] = []
  for (let i = 0; i < n; i++) {
    layerOf.push(i < nLayers ? i : 1 + Math.floor(Math.random() * (nLayers - 1)))
  }
  layerOf.sort((a, b) => a - b)

  const ids = LETTERS.slice(0, n).split('')
  const activities: ActivityInput[] = ids.map((id) => ({
    id,
    name: '',
    predecessors: [],
    duration: 2 + Math.floor(Math.random() * 14),
  }))
  const indices = Array.from({ length: n }, (_, i) => i)
  for (let i = 0; i < n; i++) {
    if (layerOf[i] === 0) continue
    const previousLayer = indices.filter((j) => layerOf[j] === layerOf[i] - 1)
    const anyEarlier = indices.filter((j) => layerOf[j] < layerOf[i])
    const preds = new Set<number>()
    preds.add(previousLayer[Math.floor(Math.random() * previousLayer.length)])
    if (anyEarlier.length > 1 && Math.random() < 0.45) {
      preds.add(anyEarlier[Math.floor(Math.random() * anyEarlier.length)])
    }
    activities[i].predecessors = [...preds].map((j) => ids[j]).sort()
  }
  return activities
}

export interface LayoutPoint {
  x: number
  y: number
}

export interface NetworkLayout {
  /** activity centers, keyed by id */
  pos: Record<string, LayoutPoint>
  start: LayoutPoint
  finish: LayoutPoint
  width: number
  height: number
}

/**
 * Node positions matching the textbook's figure for the St. John's
 * Hospital network: A's subtree across the top half (I / A–F–K lanes),
 * C–G through the middle, B–D–H–J along the bottom with E below, and J
 * sitting directly under K.
 */
const CLASS_POS: Record<string, LayoutPoint> = {
  A: { x: 235, y: 195 },
  B: { x: 235, y: 425 },
  I: { x: 410, y: 75 },
  F: { x: 410, y: 195 },
  C: { x: 410, y: 310 },
  D: { x: 410, y: 425 },
  E: { x: 410, y: 530 },
  G: { x: 585, y: 310 },
  H: { x: 585, y: 425 },
  J: { x: 760, y: 425 },
  K: { x: 760, y: 195 },
}
const CLASS_LAYOUT_W = 980
const CLASS_LAYOUT_H = 590

/** true when every activity is a class activity and every precedence is a
 *  class precedence — i.e. the project is St. John's or a piece of it
 *  (activities hidden, edges removed), so the textbook positions apply */
function isClassSubset(inputs: ActivityInput[]): boolean {
  if (inputs.length === 0) return false
  const classPreds: Record<string, Set<string>> = Object.fromEntries(
    ST_JOHNS.map((a) => [a.id, new Set(a.predecessors)]),
  )
  return inputs.every((a) => {
    const preds = classPreds[a.id]
    return preds !== undefined && a.predecessors.every((p) => preds.has(p))
  })
}

/**
 * Automatic left-to-right layered layout for an arbitrary project DAG.
 * Layer = longest chain of predecessors; within a layer, nodes are ordered
 * by the average vertical position of their predecessors to limit arrow
 * crossings. The class project (or any piece of it) instead uses the
 * textbook figure's positions, so the on-screen network matches the book
 * and nodes stay put as activities are hidden and shown. Shared by the
 * on-screen network and the PDF worksheet.
 */
export function layoutNetwork(inputs: ActivityInput[]): NetworkLayout {
  if (isClassSubset(inputs)) {
    const pos = Object.fromEntries(inputs.map((a) => [a.id, CLASS_POS[a.id]]))
    const hasSuccessor = new Set(inputs.flatMap((a) => a.predecessors))
    const sinks = inputs.filter((a) => !hasSuccessor.has(a.id))
    const finishY =
      sinks.length > 0
        ? sinks.reduce((sum, a) => sum + pos[a.id].y, 0) / sinks.length
        : CLASS_LAYOUT_H / 2
    return {
      pos,
      start: { x: 60, y: 310 },
      finish: { x: CLASS_LAYOUT_W - 60, y: finishY },
      width: CLASS_LAYOUT_W,
      height: CLASS_LAYOUT_H,
    }
  }
  return autoLayout(inputs)
}

function autoLayout(inputs: ActivityInput[]): NetworkLayout {
  const byId = Object.fromEntries(inputs.map((a) => [a.id, a]))
  const layerOf: Record<string, number> = {}
  const layerFor = (id: string): number => {
    if (layerOf[id] !== undefined) return layerOf[id]
    const a = byId[id]
    layerOf[id] =
      a.predecessors.length > 0
        ? 1 + Math.max(...a.predecessors.map(layerFor))
        : 0
    return layerOf[id]
  }
  for (const a of inputs) layerFor(a.id)

  const nLayers = 1 + Math.max(0, ...Object.values(layerOf))
  const layers: string[][] = Array.from({ length: nLayers }, () => [])
  for (const a of inputs) layers[layerOf[a.id]].push(a.id)

  const maxRows = Math.max(...layers.map((l) => l.length))
  const COL_GAP = 165
  const X0 = 190
  const width = X0 + (nLayers - 1) * COL_GAP + 135
  const height = Math.max(300, maxRows * 84 + 72)

  const pos: Record<string, LayoutPoint> = {}
  const yFor = (index: number, count: number) =>
    36 + ((index + 0.5) * (height - 72)) / count

  layers.forEach((ids, li) => {
    const x = X0 + li * COL_GAP
    if (li > 0) {
      // barycenter ordering: follow the average y of predecessors
      const key = (id: string) => {
        const preds = byId[id].predecessors
        if (preds.length === 0) return height / 2
        return preds.reduce((sum, p) => sum + (pos[p]?.y ?? height / 2), 0) / preds.length
      }
      ids.sort((a, b) => key(a) - key(b))
    }
    ids.forEach((id, i) => {
      pos[id] = { x, y: yFor(i, ids.length) }
    })
  })

  const hasSuccessor = new Set(inputs.flatMap((a) => a.predecessors))
  const sinks = inputs.filter((a) => !hasSuccessor.has(a.id))
  const finishY =
    sinks.length > 0
      ? sinks.reduce((sum, a) => sum + pos[a.id].y, 0) / sinks.length
      : height / 2

  return {
    pos,
    start: { x: 55, y: height / 2 },
    finish: { x: width - 55, y: finishY },
    width,
    height,
  }
}

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
