/**
 * Event-driven M/M/1 queue simulation.
 *
 * Time is measured in sim-hours; rates (lambda, mu) are per hour, matching
 * the class notation. The engine advances in arbitrary time slices (driven
 * by the animation loop) and processes arrival/departure events in exact
 * order within each slice, so statistics are exact regardless of frame rate
 * or playback speed.
 */

export interface Customer {
  id: number
  /** sim-hours */
  arrivedAt: number
  /** sim-hours; set when service begins */
  serviceStart?: number
}

export interface SimEvent {
  type: 'arrival' | 'departure'
  id: number
  /** sim-hours */
  at: number
}

/** Histogram bins for interarrival/service durations, in minutes. */
export const DURATION_BIN_COUNT = 30
export const DURATION_BIN_WIDTH_MIN = 0.5
/** Track time-in-state for n = 0..MAX_TRACKED_N (higher n lumped into last). */
export const MAX_TRACKED_N = 40

export interface Snapshot {
  /** sim-hours elapsed since the simulation started */
  t: number
  /** sim-hours elapsed since the current stats epoch began (last dial change) */
  elapsed: number
  lambda: number
  mu: number
  n: number
  queueLength: number
  /** lifetime counters (shown in the header row) */
  arrivals: number
  departures: number
  /** observed arrival rate, per hour (current epoch) */
  lambdaObs: number | null
  /** observed fraction of time the server was busy (current epoch) */
  rhoObs: number | null
  /** observed time-average number in system (current epoch) */
  lObs: number | null
  /** observed time-average number waiting in line (current epoch) */
  lqObs: number | null
  /** observed mean time in system per completed customer, hours (current epoch) */
  wObs: number | null
  /** observed mean time waiting in line per completed customer, hours (current epoch) */
  wqObs: number | null
  interarrivalBins: number[]
  serviceBins: number[]
  /** observations that fell beyond the last histogram bin (≥ 15 min) */
  interarrivalOverflow: number
  serviceOverflow: number
  /** share of epoch time spent with exactly n in system, n = 0..MAX_TRACKED_N */
  stateShare: number[]
}

export class MM1Sim {
  t = 0
  lambda: number
  mu: number
  /** customers waiting (excludes the one in service) */
  queue: Customer[] = []
  inService: Customer | null = null

  arrivals = 0
  departures = 0

  private nextArrivalAt: number
  private serviceEndsAt = Infinity
  private nextId = 1
  private lastArrivalAt = 0

  /**
   * Statistics accumulate within an "epoch" that restarts whenever a rate
   * changes, so observed values are always comparable to theory computed
   * from the current dials. Lifetime counters (arrivals/departures) and the
   * clock t are never reset.
   */
  private statsStart = 0
  private statsArrivals = 0
  private statsDepartures = 0
  private areaN = 0
  private areaNq = 0
  private busyTime = 0
  private sumW = 0
  private sumWq = 0
  private interarrivalBins = new Array(DURATION_BIN_COUNT).fill(0)
  private serviceBins = new Array(DURATION_BIN_COUNT).fill(0)
  private interarrivalOverflow = 0
  private serviceOverflow = 0
  private stateTime = new Array(MAX_TRACKED_N + 1).fill(0)

  constructor(lambda: number, mu: number) {
    this.lambda = lambda
    this.mu = mu
    this.nextArrivalAt = this.expSample(lambda)
  }

  /** Exponential random variate with the given rate (per hour). */
  private expSample(ratePerHour: number): number {
    return -Math.log(1 - Math.random()) / ratePerHour
  }

  get n(): number {
    return this.queue.length + (this.inService ? 1 : 0)
  }

  /**
   * Rates can change mid-run. By memorylessness of the exponential
   * distribution, resampling the remaining wait at the new rate is
   * statistically equivalent to having used the new rate all along.
   * Accumulated statistics restart so observed values stay comparable to
   * theory computed from the new dials; the live queue is untouched.
   */
  setLambda(lambda: number) {
    this.lambda = lambda
    this.nextArrivalAt = this.t + this.expSample(lambda)
    this.resetStats()
  }

  setMu(mu: number) {
    this.mu = mu
    if (this.inService) this.serviceEndsAt = this.t + this.expSample(mu)
    this.resetStats()
  }

  private resetStats() {
    this.statsStart = this.t
    this.lastArrivalAt = this.t
    this.statsArrivals = 0
    this.statsDepartures = 0
    this.areaN = 0
    this.areaNq = 0
    this.busyTime = 0
    this.sumW = 0
    this.sumWq = 0
    this.interarrivalBins.fill(0)
    this.serviceBins.fill(0)
    this.interarrivalOverflow = 0
    this.serviceOverflow = 0
    this.stateTime.fill(0)
  }

  /** Accumulate time-weighted statistics over a quiet stretch of length dt. */
  private integrate(dt: number) {
    if (dt <= 0) return
    this.areaN += this.n * dt
    this.areaNq += this.queue.length * dt
    if (this.inService) this.busyTime += dt
    this.stateTime[Math.min(this.n, MAX_TRACKED_N)] += dt
  }

  /** Bin index for a duration, or -1 when it falls beyond the axis range. */
  private durationBin(hours: number): number {
    const minutes = hours * 60
    const bin = Math.floor(minutes / DURATION_BIN_WIDTH_MIN)
    return bin < DURATION_BIN_COUNT ? bin : -1
  }

  /** Advance the simulation by dt sim-hours; returns events that occurred. */
  advance(dt: number): SimEvent[] {
    const events: SimEvent[] = []
    const tEnd = this.t + dt
    for (;;) {
      const nextEventAt = Math.min(this.nextArrivalAt, this.serviceEndsAt)
      if (nextEventAt > tEnd) break
      this.integrate(nextEventAt - this.t)
      this.t = nextEventAt
      if (this.nextArrivalAt <= this.serviceEndsAt) {
        this.handleArrival(events)
      } else {
        this.handleDeparture(events)
      }
    }
    this.integrate(tEnd - this.t)
    this.t = tEnd
    return events
  }

  private handleArrival(events: SimEvent[]) {
    const gapBin = this.durationBin(this.t - this.lastArrivalAt)
    if (gapBin >= 0) this.interarrivalBins[gapBin]++
    else this.interarrivalOverflow++
    this.lastArrivalAt = this.t
    this.arrivals++
    this.statsArrivals++

    const customer: Customer = { id: this.nextId++, arrivedAt: this.t }
    if (this.inService) {
      this.queue.push(customer)
    } else {
      customer.serviceStart = this.t
      this.inService = customer
      this.serviceEndsAt = this.t + this.expSample(this.mu)
    }
    events.push({ type: 'arrival', id: customer.id, at: this.t })
    this.nextArrivalAt = this.t + this.expSample(this.lambda)
  }

  private handleDeparture(events: SimEvent[]) {
    const customer = this.inService!
    this.departures++
    this.statsDepartures++
    this.sumW += this.t - customer.arrivedAt
    this.sumWq += customer.serviceStart! - customer.arrivedAt
    const svcBin = this.durationBin(this.t - customer.serviceStart!)
    if (svcBin >= 0) this.serviceBins[svcBin]++
    else this.serviceOverflow++
    events.push({ type: 'departure', id: customer.id, at: this.t })

    const next = this.queue.shift()
    if (next) {
      next.serviceStart = this.t
      this.inService = next
      this.serviceEndsAt = this.t + this.expSample(this.mu)
    } else {
      this.inService = null
      this.serviceEndsAt = Infinity
    }
  }

  snapshot(): Snapshot {
    const elapsed = this.t - this.statsStart
    const d = this.statsDepartures
    return {
      t: this.t,
      elapsed,
      lambda: this.lambda,
      mu: this.mu,
      n: this.n,
      queueLength: this.queue.length,
      arrivals: this.arrivals,
      departures: this.departures,
      lambdaObs: elapsed > 0 ? this.statsArrivals / elapsed : null,
      rhoObs: elapsed > 0 ? this.busyTime / elapsed : null,
      lObs: elapsed > 0 ? this.areaN / elapsed : null,
      lqObs: elapsed > 0 ? this.areaNq / elapsed : null,
      wObs: d > 0 ? this.sumW / d : null,
      wqObs: d > 0 ? this.sumWq / d : null,
      interarrivalBins: this.interarrivalBins.slice(),
      serviceBins: this.serviceBins.slice(),
      interarrivalOverflow: this.interarrivalOverflow,
      serviceOverflow: this.serviceOverflow,
      stateShare:
        elapsed > 0
          ? this.stateTime.map((s) => s / elapsed)
          : this.stateTime.slice(),
    }
  }
}

/** Theoretical M/M/1 quantities (null when the system is unstable). */
export function mm1Theory(lambda: number, mu: number) {
  if (lambda >= mu) {
    return { stable: false as const, rho: lambda / mu, l: null, lq: null, w: null, wq: null }
  }
  const rho = lambda / mu
  const l = lambda / (mu - lambda)
  const w = 1 / (mu - lambda)
  return { stable: true as const, rho, l, lq: rho * l, w, wq: rho * w }
}
