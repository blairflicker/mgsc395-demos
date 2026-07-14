import { useEffect, useReducer, useRef, useState } from 'react'
import DemoHeader from '../../../components/DemoHeader'
import { MM1Sim, mm1Theory, type Snapshot } from '../../../lib/mm1'
import { Stage, type StageCustomer } from './Stage'
import {
  COLOR_LAMBDA,
  COLOR_SERVICE,
  COLOR_SYSTEM,
  COLOR_W,
  DurationHistogram,
  LOverTimeChart,
  StateDistribution,
  type LSample,
} from './charts'

const SPEEDS = [0.5, 1, 2, 5, 15, 60]
/** at 1× playback, one real second = one sim-minute */
const BASE_SIM_HOURS_PER_REAL_SECOND = 1 / 60
const DEPART_ANIMATION_MS = 600
/** only this many waiting customers are handed to the Stage — enough to
 *  fill the serpentine rows; the rest are summarized by the "+N more"
 *  chip, keeping per-frame work bounded when the system is unstable and
 *  the queue grows into the thousands */
const STAGE_QUEUE_CAP = 200
/** L-over-time sampling: initial spacing between samples (sim-hours);
 *  the buffer decimates and doubles the spacing past this many points,
 *  so it always spans the whole run with bounded memory */
const L_SAMPLE_INTERVAL_H = 1 / 120
const L_HISTORY_MAX_POINTS = 1440

function fmt(x: number | null | undefined, digits = 2): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—'
  return x.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function fmtClock(hours: number): string {
  const totalMinutes = Math.floor(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

export default function SuppBWaitingLines() {
  const [lambda, setLambda] = useState(30)
  const [mu, setMu] = useState(35)
  const [speed, setSpeed] = useState(1)
  // starts paused so students can set the dials first, then hit Play
  const [running, setRunning] = useState(false)
  const [stats, setStats] = useState<Snapshot | null>(null)
  const [historySnap, setHistorySnap] = useState<LSample[]>([])
  const [, frameTick] = useReducer((x: number) => x + 1, 0)

  const simRef = useRef<MM1Sim | null>(null)
  if (!simRef.current) simRef.current = new MM1Sim(30, 35)
  const speedRef = useRef(speed)
  speedRef.current = speed
  const departingRef = useRef<{ id: number; realAt: number }[]>([])
  const historyRef = useRef<LSample[]>([])
  const samplerRef = useRef({ interval: L_SAMPLE_INTERVAL_H, nextAt: 0 })

  useEffect(() => {
    document.title = 'Waiting Lines · MGSC 395'
    return () => {
      document.title = 'MGSC 395 · Interactive Demos'
    }
  }, [])

  // animation + simulation loop
  useEffect(() => {
    if (!running) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      // clamp so a backgrounded tab doesn't fast-forward on return
      const dtReal = Math.min((now - last) / 1000, 0.1)
      last = now
      const sim = simRef.current!
      const events = sim.advance(
        dtReal * speedRef.current * BASE_SIM_HOURS_PER_REAL_SECOND,
      )
      for (const e of events) {
        if (e.type === 'departure') {
          departingRef.current.push({ id: e.id, realAt: now })
        }
      }
      // sample L history; decimate + widen spacing so the buffer always
      // covers the whole run with bounded memory
      const sampler = samplerRef.current
      if (sim.t >= sampler.nextAt) {
        historyRef.current.push({ t: sim.t, n: sim.n, lRun: sim.lObsNow() })
        sampler.nextAt = sim.t + sampler.interval
        if (historyRef.current.length > L_HISTORY_MAX_POINTS) {
          historyRef.current = historyRef.current.filter((_, i) => i % 2 === 0)
          sampler.interval *= 2
        }
      }
      departingRef.current = departingRef.current
        .filter((d) => now - d.realAt < DEPART_ANIMATION_MS)
        .slice(-10)
      frameTick()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running])

  // slower cadence for charts and numeric readouts; idle while paused
  // (dial changes and reset push a fresh snapshot themselves)
  useEffect(() => {
    setStats(simRef.current!.snapshot())
    setHistorySnap(historyRef.current.slice())
    if (!running) return
    const interval = setInterval(() => {
      setStats(simRef.current!.snapshot())
      setHistorySnap(historyRef.current.slice())
    }, 250)
    return () => clearInterval(interval)
  }, [running])

  const reset = () => {
    simRef.current = new MM1Sim(lambda, mu)
    departingRef.current = []
    historyRef.current = []
    samplerRef.current = { interval: L_SAMPLE_INTERVAL_H, nextAt: 0 }
    setStats(simRef.current.snapshot())
    setHistorySnap([])
    frameTick()
  }

  /** a null-lRun marker makes the running-average line break cleanly at
   *  the dial change instead of drawing a steep false drop */
  const markEpoch = () => {
    const sim = simRef.current!
    historyRef.current.push({ t: sim.t, n: sim.n, lRun: null })
    setStats(sim.snapshot())
    setHistorySnap(historyRef.current.slice())
  }

  const changeLambda = (v: number) => {
    setLambda(v)
    simRef.current!.setLambda(v)
    markEpoch()
  }
  const changeMu = (v: number) => {
    setMu(v)
    simRef.current!.setMu(v)
    markEpoch()
  }

  const sim = simRef.current
  const theory = mm1Theory(lambda, mu)
  const unstable = !theory.stable

  const stageCustomers: StageCustomer[] = [
    ...sim.queue.slice(0, STAGE_QUEUE_CAP).map((c, i) => ({
      id: c.id,
      role: 'waiting' as const,
      queueIndex: i,
    })),
    ...(sim.inService ? [{ id: sim.inService.id, role: 'in-service' as const }] : []),
    ...departingRef.current.map((d) => ({ id: d.id, role: 'departing' as const })),
  ]

  const s = stats
  const littleProduct =
    s && s.lambdaObs !== null && s.wObs !== null ? s.lambdaObs * s.wObs : null

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DemoHeader label="Supplement B · Waiting Lines" title="The M/M/1 Queue, Live">
        Customers arrive at random (Poisson, rate λ) and are served one at a
        time (exponential service, rate μ). Watch the line breathe, then check
        the three numbers of Little&rsquo;s Law: <strong>L&nbsp;=&nbsp;λ&nbsp;×&nbsp;W</strong>.
      </DemoHeader>

      {/* Controls */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 flex items-center justify-between text-sm font-medium text-stone-700">
              <span>
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                  style={{ backgroundColor: COLOR_LAMBDA }}
                />
                Arrival rate λ
              </span>
              <span className="tabular-nums text-stone-500">{lambda}/hr</span>
            </span>
            <input
              type="range"
              min={5}
              max={60}
              step={1}
              value={lambda}
              onChange={(e) => changeLambda(Number(e.target.value))}
              className="w-full accent-garnet-700"
            />
          </label>
          <label className="block">
            <span className="mb-1 flex items-center justify-between text-sm font-medium text-stone-700">
              <span>
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                  style={{ backgroundColor: COLOR_SERVICE }}
                />
                Service rate μ
              </span>
              <span className="tabular-nums text-stone-500">{mu}/hr</span>
            </span>
            <input
              type="range"
              min={5}
              max={60}
              step={1}
              value={mu}
              onChange={(e) => changeMu(Number(e.target.value))}
              className="w-full accent-garnet-700"
            />
          </label>
          <div>
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Speed
            </span>
            <div className="flex overflow-hidden rounded-lg border border-stone-300">
              {SPEEDS.map((sp) => (
                <button
                  key={sp}
                  onClick={() => setSpeed(sp)}
                  className={[
                    'flex-1 px-1 py-1.5 text-xs font-medium transition-colors',
                    sp === speed
                      ? 'bg-garnet-800 text-white'
                      : 'bg-white text-stone-600 hover:bg-stone-50',
                  ].join(' ')}
                >
                  {sp}×
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => setRunning((r) => !r)}
              className="flex-1 rounded-lg bg-garnet-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-garnet-700"
            >
              {running ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={reset}
              className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-stone-500">
          <span>
            Simulated time:{' '}
            <span className="font-medium text-stone-700 tabular-nums">
              {fmtClock(sim.t)}
            </span>
          </span>
          <span>
            Arrivals:{' '}
            <span className="font-medium text-stone-700 tabular-nums">
              {sim.arrivals}
            </span>
          </span>
          <span>
            Departures:{' '}
            <span className="font-medium text-stone-700 tabular-nums">
              {sim.departures}
            </span>
          </span>
          <span>
            In system now:{' '}
            <span className="font-medium text-stone-700 tabular-nums">{sim.n}</span>
          </span>
        </div>
      </div>

      {unstable && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>λ ≥ μ — the system is unstable.</strong> Customers arrive at
          least as fast as they can be served, so the line grows without bound.
          The M/M/1 formulas require μ &gt; λ; theoretical values are
          unavailable until you lower λ or raise μ.
        </div>
      )}

      {/* Animated stage */}
      <div className="mb-4">
        <Stage
          customers={stageCustomers}
          serverBusy={sim.inService !== null}
          queueLength={sim.queue.length}
        />
      </div>

      {/* L over time */}
      <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="mb-1 text-lg font-semibold text-stone-900">
          L over time
        </h2>
        <p className="mb-3 max-w-3xl text-sm text-stone-600">
          The number in the system jumps around moment to moment, but its
          running average settles down toward the theoretical L — the same
          story the animation tells, drawn since the start of the run.
        </p>
        <LOverTimeChart
          history={historySnap}
          theoryL={theory.stable ? theory.l : null}
          simT={s?.t ?? 0}
        />
      </div>

      {/* Little's Law */}
      <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="mb-1 text-lg font-semibold text-stone-900">
          Little&rsquo;s Law: L = λ × W
        </h2>
        <p className="mb-4 text-sm text-stone-600">
          Three quantities, one relationship. Nature sets the third once you
          know any two — watch the observed values converge as time passes.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-stone-200 p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-stone-600">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLOR_LAMBDA }}
              />
              λ — arrival rate
            </div>
            <div className="text-3xl font-bold text-stone-900 tabular-nums">
              {fmt(s?.lambdaObs, 1)}
              <span className="ml-1 text-base font-normal text-stone-500">/hr</span>
            </div>
            <div className="mt-1 text-xs text-stone-500">
              observed · dial set to {lambda}/hr
            </div>
          </div>
          <div className="rounded-lg border border-stone-200 p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-stone-600">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLOR_W }}
              />
              W — time in system
            </div>
            <div className="text-3xl font-bold text-stone-900 tabular-nums">
              {fmt(s?.wObs !== null && s?.wObs !== undefined ? s.wObs * 60 : null, 1)}
              <span className="ml-1 text-base font-normal text-stone-500">min</span>
            </div>
            <div className="mt-1 text-xs text-stone-500">
              observed avg per completed customer
              {theory.stable && <> · theory {fmt(theory.w! * 60, 1)} min</>}
            </div>
          </div>
          <div className="rounded-lg border border-stone-200 p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-stone-600">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLOR_SYSTEM }}
              />
              L — number in system
            </div>
            <div className="text-3xl font-bold text-stone-900 tabular-nums">
              {fmt(s?.lObs, 2)}
              <span className="ml-1 text-base font-normal text-stone-500">
                customers
              </span>
            </div>
            <div className="mt-1 text-xs text-stone-500">
              observed time-average
              {theory.stable && <> · theory {fmt(theory.l, 2)}</>}
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-stone-50 px-4 py-3 text-center text-sm text-stone-700">
          <span className="tabular-nums">
            λ × W = {fmt(s?.lambdaObs, 1)}/hr × {fmt(
              s?.wObs !== null && s?.wObs !== undefined ? s.wObs : null,
              3,
            )}{' '}
            hr = <strong>{fmt(littleProduct, 2)}</strong>
          </span>
          <span className="mx-3 text-stone-400">vs</span>
          <span className="tabular-nums">
            L = <strong>{fmt(s?.lObs, 2)}</strong>
          </span>
          <div className="mt-1 text-xs text-stone-500">
            The two sides drift apart in short runs and converge as the
            simulation clock grows — that&rsquo;s Little&rsquo;s Law at work.
          </div>
        </div>
      </div>

      {/* Theory vs observed table */}
      <div className="mb-6 overflow-x-auto rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="mb-1 text-lg font-semibold text-stone-900">
          Every formula from class, checked against the simulation
        </h2>
        <p className="mb-3 text-sm text-stone-600">
          Theory uses the current dials (λ = {lambda}, μ = {mu}). Observed
          values come from the animation above — nothing is faked. Moving a
          dial restarts the observed measurements so the comparison is always
          apples-to-apples (measuring for {fmtClock(s?.elapsed ?? 0)} so far).
        </p>
        <table className="w-full min-w-105 text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
              <th className="py-2 pr-4 font-semibold">Quantity</th>
              <th className="py-2 pr-4 font-semibold">Formula</th>
              <th className="py-2 pr-4 text-right font-semibold">Theory</th>
              <th className="py-2 text-right font-semibold">Observed</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {[
              {
                name: 'ρ — utilization',
                formula: 'λ / μ',
                theory: theory.stable ? `${fmt(theory.rho * 100, 1)}%` : `${fmt(theory.rho * 100, 1)}% (≥100%)`,
                observed: s?.rhoObs !== null ? `${fmt((s?.rhoObs ?? 0) * 100, 1)}%` : '—',
              },
              {
                name: 'L — avg # in system',
                formula: 'λ / (μ − λ)',
                theory: theory.stable ? fmt(theory.l, 2) : 'n/a — unstable',
                observed: fmt(s?.lObs, 2),
              },
              {
                name: 'Lq — avg # waiting in line',
                formula: 'ρ × L',
                theory: theory.stable ? fmt(theory.lq, 2) : 'n/a — unstable',
                observed: fmt(s?.lqObs, 2),
              },
              {
                name: 'W — avg time in system',
                formula: '1 / (μ − λ)',
                theory: theory.stable ? `${fmt(theory.w! * 60, 1)} min` : 'n/a — unstable',
                observed:
                  s?.wObs !== null && s?.wObs !== undefined
                    ? `${fmt(s.wObs * 60, 1)} min`
                    : '—',
              },
              {
                name: 'Wq — avg time waiting in line',
                formula: 'ρ × W',
                theory: theory.stable ? `${fmt(theory.wq! * 60, 1)} min` : 'n/a — unstable',
                observed:
                  s?.wqObs !== null && s?.wqObs !== undefined
                    ? `${fmt(s.wqObs * 60, 1)} min`
                    : '—',
              },
            ].map((row) => (
              <tr key={row.name} className="border-b border-stone-100 last:border-0">
                <td className="py-2 pr-4 font-medium text-stone-800">{row.name}</td>
                <td className="py-2 pr-4 text-stone-500">{row.formula}</td>
                <td className="py-2 pr-4 text-right text-stone-700">{row.theory}</td>
                <td className="py-2 text-right font-medium text-stone-900">
                  {row.observed}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Distributions */}
      <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="mb-1 text-lg font-semibold text-stone-900">
          What&rsquo;s really going on underneath
        </h2>
        <p className="mb-4 max-w-3xl text-sm text-stone-600">
          Arrivals follow a Poisson process, so the <em>time between
          arrivals</em> is exponential — the same distribution family as the
          service times. Both histograms fill in live from the animation, and
          both take the same shape: lots of short gaps, a long tail of rare
          long ones. That shared &ldquo;memoryless&rdquo; shape is exactly what
          the two M&rsquo;s in M/M/1 stand for.
        </p>
        <div className="grid gap-6 lg:grid-cols-3">
          <DurationHistogram
            bins={s?.interarrivalBins ?? []}
            overflow={s?.interarrivalOverflow ?? 0}
            ratePerHour={lambda}
            color={COLOR_LAMBDA}
            title="Time between arrivals"
            caption={`exponential with rate λ = ${lambda}/hr · mean ${fmt(60 / lambda, 1)} min`}
          />
          <DurationHistogram
            bins={s?.serviceBins ?? []}
            overflow={s?.serviceOverflow ?? 0}
            ratePerHour={mu}
            color={COLOR_SERVICE}
            title="Service durations"
            caption={`exponential with rate μ = ${mu}/hr · mean ${fmt(60 / mu, 1)} min`}
          />
          <StateDistribution
            stateShare={s?.stateShare ?? []}
            rho={theory.stable ? theory.rho : null}
            simTime={s?.elapsed ?? 0}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-5 text-sm">
          <h2 className="mb-2 font-semibold text-stone-900">
            The M/M/1 assumptions
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-stone-600">
            <li>Customer population is infinite and patient</li>
            <li>Arrivals are Poisson with mean rate λ</li>
            <li>Service times are exponential with mean rate μ</li>
            <li>Mean service rate exceeds mean arrival rate (μ &gt; λ)</li>
            <li>Customers are served first-come, first-served</li>
            <li>The waiting line can be any length</li>
          </ul>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-5 text-sm">
          <h2 className="mb-2 font-semibold text-stone-900">
            Try this
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-stone-600">
            <li>
              The default dials (λ = 30, μ = 35) are the Sunnyville grocery
              example from class: ρ = 85.7%, L = 6 customers, W = 12 minutes.
              Run at 60× and watch the observed values find those numbers.
            </li>
            <li>
              Push λ from 30 up to 33. Utilization only rises from 85.7% to
              94.3% — but theory says L jumps from 6 to 16.5 customers and W
              from 12 to 30 minutes. Congestion explodes as ρ approaches 100%.
            </li>
            <li>
              Set λ = μ. Utilization looks fine on paper, but watch the line.
              This is why real systems need a capacity cushion.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
