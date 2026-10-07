/**
 * Chapter 7A — Keith's Car Wash: flow through a process with two routings.
 * Pure computation, no React.
 *
 * Conventions:
 * - Every station is a single server. The number in parentheses on the
 *   slide is its minutes per car, so its capacity is 60 / minutes cars/hr.
 * - Arrivals are deterministic and constant: a Standard car every 60/λS
 *   minutes and a Deluxe car every 60/λD minutes.
 * - Fluid (long-run) view: the flow out of a station is the lesser of what
 *   flows in and its capacity; the shortfall piles up in front of it at a
 *   constant rate. Where both types share a station the shortfall is split
 *   in proportion (FIFO), so the mix that leaves is the mix that arrived.
 * - Discrete view: CarWashSim moves individual cars through FIFO queues
 *   with exact event times, so its long-run counts match the fluid view.
 * - Class data: capacities 12 / 10 / 5 / 4 / 12 / 3 / 5 / 6 cars per hour.
 *   Standard cars are capped at 4/hr by A4, Deluxe at 3/hr by A6, and the
 *   two together at 6/hr by A8 — so 6 cars/hr is the most the wash can
 *   ever finish, and only when at most 4 are Standard and 3 are Deluxe.
 */

export type WashType = 'standard' | 'deluxe'
export const WASH_TYPES: WashType[] = ['standard', 'deluxe']
export const WASH_LABEL: Record<WashType, string> = {
  standard: 'Standard',
  deluxe: 'Deluxe',
}

export interface Station {
  id: string
  /** minutes to process one car */
  minutes: number
}

/** in the order flow reaches them (A3/A4 and A5/A6/A7 are parallel legs) */
export const STATIONS: Station[] = [
  { id: 'A1', minutes: 5 },
  { id: 'A2', minutes: 6 },
  { id: 'A3', minutes: 12 },
  { id: 'A4', minutes: 15 },
  { id: 'A5', minutes: 5 },
  { id: 'A6', minutes: 20 },
  { id: 'A7', minutes: 12 },
  { id: 'A8', minutes: 10 },
]

export const STATION_BY_ID: Record<string, Station> = Object.fromEntries(
  STATIONS.map((s) => [s.id, s]),
)

/** the order each wash type visits the stations */
export const ROUTE: Record<WashType, string[]> = {
  standard: ['A1', 'A2', 'A3', 'A4', 'A8'],
  deluxe: ['A1', 'A2', 'A5', 'A6', 'A7', 'A8'],
}

/** cars per hour, by wash type */
export type Rates = Record<WashType, number>

export const ZERO_RATES: Rates = { standard: 0, deluxe: 0 }

/** the slide's opening scenario: A1 admitting all 12 cars/hr it can */
export const CLASS_RATES: Rates = { standard: 6, deluxe: 6 }

export const capacityPerHour = (s: Station): number => 60 / s.minutes

/** which wash types pass through a station */
export const servedBy = (id: string): WashType[] =>
  WASH_TYPES.filter((t) => ROUTE[t].includes(id))

export const totalRate = (r: Rates): number => r.standard + r.deluxe

/** minutes of pure processing on a wash's route — its time in the wash with no waiting */
export const routeMinutes = (t: WashType): number =>
  ROUTE[t].reduce((sum, id) => sum + STATION_BY_ID[id].minutes, 0)

// ── Fluid (long-run) flows ───────────────────────────────────────

export interface StationFlow {
  id: string
  /** cars per hour the station can process */
  capacity: number
  inflow: Rates
  outflow: Rates
  inTotal: number
  outTotal: number
  /** cars per hour piling up in front of the station (≥ 0) */
  accumulation: number
  /** fraction of the station's time in use, 0..1 */
  utilization: number
}

export interface FluidResult {
  stations: StationFlow[]
  byId: Record<string, StationFlow>
  /** cars per hour that come out the far end, by type */
  throughput: Rates
  totalThroughput: number
  /** cars per hour joining some line and never leaving it */
  totalAccumulation: number
}

/**
 * Push constant arrival rates through the network. A station passes on
 * min(inflow, capacity); the rest accumulates in front of it. Both types
 * are throttled by the same factor at a shared station (FIFO keeps the
 * mix), and each type's outflow is handed to the next station on its route.
 */
export function fluidFlows(arrivals: Rates): FluidResult {
  const inflow: Record<string, Rates> = {}
  for (const s of STATIONS) inflow[s.id] = { standard: 0, deluxe: 0 }
  inflow.A1 = { ...arrivals }

  const throughput: Rates = { standard: 0, deluxe: 0 }
  const stations: StationFlow[] = []
  const byId: Record<string, StationFlow> = {}
  let totalAccumulation = 0

  for (const s of STATIONS) {
    const capacity = capacityPerHour(s)
    const inn = inflow[s.id]
    const inTotal = totalRate(inn)
    const share = inTotal > capacity ? capacity / inTotal : 1
    const outflow: Rates = {
      standard: inn.standard * share,
      deluxe: inn.deluxe * share,
    }
    const outTotal = totalRate(outflow)

    for (const t of WASH_TYPES) {
      if (outflow[t] === 0) continue
      const route = ROUTE[t]
      const next = route[route.indexOf(s.id) + 1]
      if (next) inflow[next][t] += outflow[t]
      else throughput[t] += outflow[t]
    }

    const accumulation = Math.max(0, inTotal - outTotal)
    totalAccumulation += accumulation
    const flow: StationFlow = {
      id: s.id,
      capacity,
      inflow: inn,
      outflow,
      inTotal,
      outTotal,
      accumulation,
      utilization: outTotal / capacity,
    }
    stations.push(flow)
    byId[s.id] = flow
  }

  return {
    stations,
    byId,
    throughput,
    totalThroughput: totalRate(throughput),
    totalAccumulation,
  }
}

// ── What the whole wash can finish ───────────────────────────────

export interface Limit {
  /** the tightest station on this leg */
  stationId: string
  /** its capacity, cars per hour */
  capacity: number
}

export interface MixLimits {
  /** Standard-only stations: Standard output can never exceed this */
  standard: Limit
  /** Deluxe-only stations */
  deluxe: Limit
  /** stations every car visits: total output can never exceed this */
  total: Limit
}

function tightestLimit(ids: string[]): Limit {
  let best: Limit | null = null
  for (const id of ids) {
    const capacity = capacityPerHour(STATION_BY_ID[id])
    if (!best || capacity < best.capacity) best = { stationId: id, capacity }
  }
  if (!best) throw new Error('no stations on this leg')
  return best
}
export function mixLimits(): MixLimits {
  const only = (t: WashType) =>
    STATIONS.filter((s) => {
      const v = servedBy(s.id)
      return v.length === 1 && v[0] === t
    }).map((s) => s.id)
  const shared = STATIONS.filter((s) => servedBy(s.id).length === 2).map(
    (s) => s.id,
  )
  return {
    standard: tightestLimit(only('standard')),
    deluxe: tightestLimit(only('deluxe')),
    total: tightestLimit(shared),
  }
}

export const MIX_LIMITS: MixLimits = mixLimits()

/** the most cars per hour the whole wash can finish, over every mix */
export const SYSTEM_CAPACITY: number = Math.min(
  MIX_LIMITS.total.capacity,
  MIX_LIMITS.standard.capacity + MIX_LIMITS.deluxe.capacity,
)

/**
 * The region of (Standard, Deluxe) output rates the wash can sustain:
 * s ≤ S, d ≤ D, s + d ≤ T. Returned as polygon vertices, counter-clockwise
 * from the origin, for drawing.
 */
export function feasibleRegion(): { s: number; d: number }[] {
  const S = MIX_LIMITS.standard.capacity
  const D = MIX_LIMITS.deluxe.capacity
  const T = MIX_LIMITS.total.capacity
  // box corners, then clip by the half-plane s + d ≤ T (Sutherland–Hodgman)
  const box = [
    { s: 0, d: 0 },
    { s: S, d: 0 },
    { s: S, d: D },
    { s: 0, d: D },
  ]
  const inside = (p: { s: number; d: number }) => p.s + p.d <= T + 1e-9
  const out: { s: number; d: number }[] = []
  for (let i = 0; i < box.length; i++) {
    const a = box[i]
    const b = box[(i + 1) % box.length]
    const ia = inside(a)
    const ib = inside(b)
    if (ia) out.push(a)
    if (ia !== ib) {
      // intersection of segment a→b with the line s + d = T
      const fa = a.s + a.d - T
      const fb = b.s + b.d - T
      const t = fa / (fa - fb)
      out.push({ s: a.s + t * (b.s - a.s), d: a.d + t * (b.d - a.d) })
    }
  }
  return out
}

// ── Discrete simulation ──────────────────────────────────────────

export interface Car {
  id: number
  type: WashType
  /** index into ROUTE[type] of the station the car is at */
  leg: number
  role: 'waiting' | 'service' | 'done'
  /** sim-minute the car arrived at the wash */
  arrivedAt: number
  /** sim-minute the car left, once done */
  doneAt: number | null
}

export interface StationState {
  id: string
  current: Car | null
  queue: Car[]
  /** cars finished at this station */
  served: number
  /** minutes spent busy, through the last completed service */
  busyMinutes: number
  /** when the current service began */
  startedAt: number
}

/**
 * Exact deterministic event simulation: every station is one FIFO server,
 * arrivals of each type come at a fixed interval, and services start the
 * instant the server frees up — no time-step rounding, so the long-run
 * pile-up rates equal the fluid model's.
 */
export class CarWashSim {
  /** sim clock, minutes */
  now = 0
  rates: Rates
  stations: Record<string, StationState> = {}
  arrived: Rates = { standard: 0, deluxe: 0 }
  completed: Rates = { standard: 0, deluxe: 0 }
  /** cars that have left, newest last; the caller trims this list */
  finished: Car[] = []
  /** one entry per finished car, oldest first (bounded): when it left,
   *  its minutes in the wash, and how many of those were spent waiting */
  doneLog: { t: number; flow: number; wait: number }[] = []

  private nextId = 1
  private nextArrival: Rates
  private lastArrival: Rates = { standard: -Infinity, deluxe: -Infinity }
  private departAt: Record<string, number> = {}

  constructor(rates: Rates) {
    this.rates = { ...rates }
    for (const s of STATIONS) {
      this.stations[s.id] = {
        id: s.id,
        current: null,
        queue: [],
        served: 0,
        busyMinutes: 0,
        startedAt: 0,
      }
      this.departAt[s.id] = Infinity
    }
    // stagger the two streams so neither always reaches A1 first
    this.nextArrival = {
      standard: this.rates.standard > 0 ? 0 : Infinity,
      deluxe: this.interval('deluxe') / 2,
    }
  }

  private interval(t: WashType): number {
    const r = this.rates[t]
    return r > 0 ? 60 / r : Infinity
  }

  /** change the dials mid-run without a burst or a gap */
  setRates(rates: Rates): void {
    for (const t of WASH_TYPES) {
      if (rates[t] === this.rates[t]) continue
      this.rates[t] = rates[t]
      const iv = this.interval(t)
      this.nextArrival[t] =
        iv === Infinity ? Infinity : Math.max(this.now, this.lastArrival[t] + iv)
    }
  }

  /** cars inside the wash right now — waiting or being served */
  wip(): number {
    let n = 0
    for (const s of STATIONS) {
      const st = this.stations[s.id]
      n += st.queue.length + (st.current ? 1 : 0)
    }
    return n
  }

  /** fraction of elapsed time a station has been busy */
  utilization(id: string): number {
    if (this.now <= 0) return 0
    const st = this.stations[id]
    const busy = st.busyMinutes + (st.current ? this.now - st.startedAt : 0)
    return busy / this.now
  }

  /**
   * Cars finished per hour over the last `windowMin` minutes (or since the
   * start, if sooner). Arrivals in half-car steps make every finish pattern
   * repeat within 120 minutes, so a 240-minute window counts an exact
   * number of repeats and reads 6.0, not 5.9, once the wash has settled.
   * Null until a car has finished.
   */
  recentRate(windowMin: number): number | null {
    if (this.now <= 0) return null
    const span = Math.min(windowMin, this.now)
    const since = this.now - span
    let count = 0
    for (let i = this.doneLog.length - 1; i >= 0 && this.doneLog[i].t > since; i--) {
      count++
    }
    return count === 0 ? null : (count * 60) / span
  }

  /**
   * Average minutes a car spent in the wash, and waiting in line, over the
   * cars that finished in the last `windowMin` minutes. Null until one has.
   */
  recentTimes(windowMin: number): { flow: number; wait: number; n: number } | null {
    const since = this.now - windowMin
    let n = 0
    let flow = 0
    let wait = 0
    for (let i = this.doneLog.length - 1; i >= 0 && this.doneLog[i].t > since; i--) {
      n++
      flow += this.doneLog[i].flow
      wait += this.doneLog[i].wait
    }
    return n === 0 ? null : { flow: flow / n, wait: wait / n, n }
  }

  /** run every event up to and including sim-minute `toTime` */
  advance(toTime: number): void {
    for (;;) {
      let t = Infinity
      let kind: 'arrive' | 'depart' = 'arrive'
      let which = ''
      for (const s of STATIONS) {
        if (this.departAt[s.id] < t) {
          t = this.departAt[s.id]
          kind = 'depart'
          which = s.id
        }
      }
      for (const w of WASH_TYPES) {
        if (this.nextArrival[w] < t) {
          t = this.nextArrival[w]
          kind = 'arrive'
          which = w
        }
      }
      if (t > toTime) break
      this.now = t
      if (kind === 'arrive') this.arrive(which as WashType)
      else this.depart(which)
    }
    this.now = toTime
  }

  private arrive(type: WashType): void {
    const car: Car = {
      id: this.nextId++,
      type,
      leg: 0,
      role: 'waiting',
      arrivedAt: this.now,
      doneAt: null,
    }
    this.arrived[type]++
    this.lastArrival[type] = this.now
    this.nextArrival[type] = this.now + this.interval(type)
    this.enter(car, ROUTE[type][0])
  }

  private enter(car: Car, stationId: string): void {
    const st = this.stations[stationId]
    if (st.current) {
      car.role = 'waiting'
      st.queue.push(car)
    } else {
      this.start(st, car)
    }
  }

  private start(st: StationState, car: Car): void {
    st.current = car
    car.role = 'service'
    st.startedAt = this.now
    this.departAt[st.id] = this.now + STATION_BY_ID[st.id].minutes
  }

  private depart(stationId: string): void {
    const st = this.stations[stationId]
    const car = st.current
    if (!car) return
    st.current = null
    st.served++
    st.busyMinutes += this.now - st.startedAt
    this.departAt[stationId] = Infinity

    const next = st.queue.shift()
    if (next) this.start(st, next)

    const route = ROUTE[car.type]
    car.leg++
    const nextStation = route[car.leg]
    if (nextStation) {
      this.enter(car, nextStation)
    } else {
      car.role = 'done'
      car.doneAt = this.now
      this.completed[car.type]++
      this.finished.push(car)
      const flow = this.now - car.arrivedAt
      this.doneLog.push({ t: this.now, flow, wait: flow - routeMinutes(car.type) })
      if (this.doneLog.length > 4000) this.doneLog.splice(0, 2000)
    }
  }
}

// ── What the page draws ──────────────────────────────────────────

export interface CarView {
  id: number
  type: WashType
  /** null once the car has left */
  stationId: string | null
  role: Car['role']
  /** position in line for waiting cars (0 = next up) */
  queueIndex: number
}

export interface SimView {
  cars: CarView[]
  queueLength: Record<string, number>
  busy: Record<string, boolean>
}

/**
 * Flatten the simulation for rendering. Only the first `queueCap` cars in
 * each line are listed (the badge shows the full count), which keeps the
 * per-frame work bounded however long the lines grow.
 */
export function simView(sim: CarWashSim, queueCap: number, finished: Car[]): SimView {
  const cars: CarView[] = []
  const queueLength: Record<string, number> = {}
  const busy: Record<string, boolean> = {}
  for (const s of STATIONS) {
    const st = sim.stations[s.id]
    queueLength[s.id] = st.queue.length
    busy[s.id] = st.current !== null
    if (st.current) {
      cars.push({
        id: st.current.id,
        type: st.current.type,
        stationId: s.id,
        role: 'service',
        queueIndex: 0,
      })
    }
    const n = Math.min(queueCap, st.queue.length)
    for (let i = 0; i < n; i++) {
      const c = st.queue[i]
      cars.push({ id: c.id, type: c.type, stationId: s.id, role: 'waiting', queueIndex: i })
    }
  }
  for (const c of finished) {
    cars.push({ id: c.id, type: c.type, stationId: null, role: 'done', queueIndex: 0 })
  }
  return { cars, queueLength, busy }
}
