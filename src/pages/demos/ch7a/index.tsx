import { useEffect, useReducer, useRef, useState } from 'react'
import DemoHeader from '../../../components/DemoHeader'
import {
  CLASS_RATES,
  CarWashSim,
  MIX_LIMITS,
  STATIONS,
  SYSTEM_CAPACITY,
  WASH_LABEL,
  WASH_TYPES,
  capacityPerHour,
  fluidFlows,
  servedBy,
  simView,
  totalRate,
  type Car,
  type Rates,
  type WashType,
} from '../../../lib/carwash'
import { Network, QUEUE_VISIBLE, TYPE_COLOR } from './Network'
import { Pipes } from './Pipes'
import { MixChart } from './MixChart'

/** sim-minutes per real second; at 1× one real second is one minute */
const SPEEDS = [1, 5, 10, 30, 60]
const DEFAULT_SPEED = 10
/** how long a finished car lingers while it fades out the exit */
const EXIT_MS = 700
/** one frame never advances past a whole stay at the quickest station (5 min),
 *  so every car is drawn at every stop even at 60× on a slow frame rate */
const MAX_SIM_MIN_PER_FRAME = 4
const MAX_RATE = 12
/** the finishing-rate readout averages over this many recent sim-minutes */
const RATE_WINDOW_MIN = 240
const RATE_STEP = 0.5

type View = 'cars' | 'pipes'

const fmt1 = (x: number) =>
  x.toLocaleString('en-US', { maximumFractionDigits: 1 })

function fmtClock(minutes: number): string {
  const total = Math.floor(minutes)
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

const who = (id: string) =>
  servedBy(id).length === 2 ? 'both' : WASH_LABEL[servedBy(id)[0]]

export default function Ch7aCarWash() {
  const [rates, setRates] = useState<Rates>({ ...CLASS_RATES })
  const [speed, setSpeed] = useState(DEFAULT_SPEED)
  // starts paused so students can set the dials first, then hit Play
  const [running, setRunning] = useState(false)
  const [showAnswers, setShowAnswers] = useState(false)
  const [view, setView] = useState<View>('cars')
  const [showFlow, setShowFlow] = useState(false)
  const [showBottlenecks, setShowBottlenecks] = useState(false)
  const [, frameTick] = useReducer((x: number) => x + 1, 0)

  const simRef = useRef<CarWashSim | null>(null)
  if (!simRef.current) simRef.current = new CarWashSim(CLASS_RATES)
  const sim = simRef.current
  const speedRef = useRef(speed)
  speedRef.current = speed
  const exitingRef = useRef<{ car: Car; realAt: number }[]>([])

  useEffect(() => {
    document.title = 'Keith’s Car Wash · MGSC 395'
    return () => {
      document.title = 'MGSC 395 · Interactive Demos'
    }
  }, [])

  useEffect(() => {
    simRef.current?.setRates(rates)
  }, [rates])

  useEffect(() => {
    if (!running) return
    let raf = 0
    let last = performance.now()
    const tick = (t: number) => {
      const sim = simRef.current!
      const dtReal = Math.min(0.1, (t - last) / 1000)
      last = t
      sim.advance(sim.now + Math.min(MAX_SIM_MIN_PER_FRAME, dtReal * speedRef.current))
      for (const car of sim.finished.splice(0)) {
        exitingRef.current.push({ car, realAt: t })
      }
      exitingRef.current = exitingRef.current.filter((e) => t - e.realAt < EXIT_MS)
      frameTick()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running])

  const reset = () => {
    simRef.current = new CarWashSim(rates)
    exitingRef.current = []
    frameTick()
  }

  const setRate = (t: WashType, value: number) => {
    if (!Number.isFinite(value)) return
    const v = Math.min(MAX_RATE, Math.max(0, Math.round(value / RATE_STEP) * RATE_STEP))
    setRates((r) => ({ ...r, [t]: v }))
  }

  const simState = simView(
    sim,
    QUEUE_VISIBLE,
    exitingRef.current.map((e) => e.car),
  )
  const flows = fluidFlows(rates)
  const arriving = totalRate(rates)
  const finished = totalRate(sim.completed)
  const recentRate = sim.recentRate(RATE_WINDOW_MIN)
  const wip = sim.wip()
  const piling = flows.stations.filter((f) => f.accumulation > 0.005)

  const checkbox = (
    label: string,
    checked: boolean,
    onChange: (v: boolean) => void,
    disabled = false,
  ) => (
    <label
      className={`flex items-center gap-1.5 ${disabled ? 'cursor-not-allowed text-stone-400' : 'cursor-pointer text-stone-700'}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-garnet-800"
      />
      {label}
    </label>
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DemoHeader label="Chapter 7A · Constraint Management" title="Keith’s Car Wash">
        Two kinds of wash share some stations and split at others. Turn each
        station&rsquo;s minutes into a flow, send cars in at a steady rate,
        and watch where the lines form.
      </DemoHeader>

      {/* Practice toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-garnet-200 bg-garnet-50/50 px-4 py-3">
        <span className="mr-1 text-sm font-semibold text-garnet-900">
          Practice mode
        </span>
        <button
          onClick={() => setShowAnswers((v) => !v)}
          className="rounded-lg bg-garnet-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-garnet-700"
        >
          {showAnswers ? 'Hide answers' : 'Show answers'}
        </button>
        <span className="text-xs text-stone-500">
          Answers mark where lines grow and how fast, extend the data table
          with the flows, and show what the wash can finish.
        </span>
      </div>

      {/* The problem */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-2 text-lg font-semibold text-stone-900">The problem</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-stone-600">
          Keith&rsquo;s Car Wash offers two types of washes: Standard and
          Deluxe. Both wash types are first processed through steps A1 and
          A2. The Standard wash then goes through steps A3 and A4 while the
          Deluxe is processed through steps A5, A6, and A7. Both offerings
          finish at the drying station (A8). The numbers in parentheses
          indicate the minutes it takes for that activity to process a
          customer.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-600">
          Read each number as a flow instead: a station that needs{' '}
          <em>m</em> minutes per car can pass at most 60 ÷ <em>m</em> cars
          per hour. Where more cars arrive than a station can pass, the
          difference waits — and keeps waiting.
        </p>
      </div>

      {/* The dials */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-stone-900">Arrivals</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {WASH_TYPES.map((t) => (
                <div key={t}>
                  <div className="mb-1 flex items-center justify-between">
                    <label
                      htmlFor={`rate-${t}`}
                      className="flex items-center gap-1.5 text-sm font-semibold text-stone-800"
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: TYPE_COLOR[t] }}
                      />
                      {WASH_LABEL[t]} cars
                    </label>
                    <span className="text-sm text-stone-700 tabular-nums">
                      <input
                        type="number"
                        min={0}
                        max={MAX_RATE}
                        step={RATE_STEP}
                        value={rates[t]}
                        onChange={(e) => setRate(t, Number(e.target.value))}
                        aria-label={`${WASH_LABEL[t]} cars per hour`}
                        className="h-7 w-16 rounded-md border border-stone-200 text-center text-sm tabular-nums focus:border-garnet-400 focus:outline-none"
                      />{' '}
                      / hr
                    </span>
                  </div>
                  <input
                    id={`rate-${t}`}
                    type="range"
                    min={0}
                    max={MAX_RATE}
                    step={RATE_STEP}
                    value={rates[t]}
                    onChange={(e) => setRate(t, Number(e.target.value))}
                    className="w-full"
                    style={{ accentColor: TYPE_COLOR[t] }}
                  />
                  <div className="mt-0.5 text-xs text-stone-500 tabular-nums">
                    {rates[t] > 0
                      ? `one every ${fmt1(60 / rates[t])} min`
                      : 'none arriving'}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-stone-500">
              Total {fmt1(arriving)} cars / hr
              {arriving > capacityPerHour(STATIONS[0]) &&
                ` — more than A1 can admit (${fmt1(capacityPerHour(STATIONS[0]))} / hr)`}
            </div>
          </div>

          <div className="lg:w-64 lg:border-l lg:border-stone-100 lg:pl-5">
            <h2 className="mb-3 text-lg font-semibold text-stone-900">Clock</h2>
            <div className="mb-3 text-2xl font-bold text-stone-900 tabular-nums">
              {fmtClock(sim.now)}
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                onClick={() => setRunning((r) => !r)}
                className="rounded-lg bg-garnet-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-garnet-700"
              >
                {running ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={reset}
                disabled={sim.now === 0}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
              >
                Reset
              </button>
            </div>
            <div className="text-xs font-semibold text-stone-500 uppercase">Speed</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {SPEEDS.map((sp) => (
                <button
                  key={sp}
                  onClick={() => setSpeed(sp)}
                  className={[
                    'rounded-md border px-2 py-1 text-xs font-medium tabular-nums',
                    sp === speed
                      ? 'border-garnet-300 bg-garnet-50 text-garnet-900'
                      : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50',
                  ].join(' ')}
                >
                  {sp}×
                </button>
              ))}
            </div>
            <div className="mt-1 text-xs text-stone-500">
              {speed} sim-minutes per real second
            </div>
          </div>
        </div>
      </div>

      {/* The wash */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-stone-900">The wash</h2>
            <div className="flex overflow-hidden rounded-md border border-stone-300 text-xs">
              {(
                [
                  ['cars', 'Cars'],
                  ['pipes', 'Pipes'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  aria-pressed={view === key}
                  className={[
                    'px-2.5 py-1 font-medium',
                    view === key
                      ? 'bg-garnet-800 text-white'
                      : 'bg-white text-stone-700 hover:bg-stone-50',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {checkbox('Show flow', showFlow, setShowFlow, view === 'pipes')}
            {checkbox('Identify bottlenecks', showBottlenecks, setShowBottlenecks)}
          </div>
        </div>

        {view === 'cars' ? (
          <>
            <Network
              view={simState}
              flows={flows}
              speed={speed}
              showFlow={showFlow}
              showBottlenecks={showBottlenecks}
              showAnswers={showAnswers}
            />
            <p className="mt-2 text-xs text-stone-500">
              Each line shows its first {QUEUE_VISIBLE} cars; the badge above it counts them all.
            </p>
          </>
        ) : (
          <>
            <Pipes arrivals={rates} flows={flows} showBottlenecks={showBottlenecks} />
            <p className="mt-2 text-xs text-stone-500">
              Each station is a pipe as wide as its capacity, and the water
              is the steady flow at the current dials. Where more water
              reaches a pipe than it can pass, the reducer in front of it
              turns garnet — the kink in the hose.
            </p>
          </>
        )}

        <div className="mt-4 grid gap-3 border-t border-stone-100 pt-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs font-semibold text-stone-500 uppercase">Arrived</div>
            <div className="text-lg text-stone-800 tabular-nums">
              {totalRate(sim.arrived).toLocaleString('en-US')}
              <span className="ml-2 text-xs text-stone-500">
                {sim.arrived.standard.toLocaleString('en-US')} S ·{' '}
                {sim.arrived.deluxe.toLocaleString('en-US')} D
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-stone-500 uppercase">Finished</div>
            <div className="text-lg text-stone-800 tabular-nums">
              {finished.toLocaleString('en-US')}
              <span className="ml-2 text-xs text-stone-500">
                {sim.completed.standard.toLocaleString('en-US')} S ·{' '}
                {sim.completed.deluxe.toLocaleString('en-US')} D
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-stone-500 uppercase">
              Finishing rate, last {RATE_WINDOW_MIN / 60} h
            </div>
            <div className="text-lg text-stone-800 tabular-nums">
              {recentRate === null ? '—' : `${recentRate.toFixed(1)} / hr`}
              <span className="ml-2 text-xs text-stone-500">
                {recentRate === null ? 'once cars finish' : 'cars finished per hour, recently'}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-stone-500 uppercase">
              In the wash now
            </div>
            <div className="text-lg text-stone-800 tabular-nums">
              {wip.toLocaleString('en-US')}
              <span className="ml-2 text-xs text-stone-500">
                {Object.values(simState.queueLength)
                  .reduce((a, b) => a + b, 0)
                  .toLocaleString('en-US')}{' '}
                waiting
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* The data — grows into the flow table when answers are shown */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-1 text-lg font-semibold text-stone-900">The data</h2>
        <p className="mb-3 text-sm text-stone-600">
          One car at a time at every station. Flow = 60 min/hr ÷ duration.
          {showAnswers &&
            ' A station passes on the lesser of what reaches it and its flow; the rest piles up in front of it, hour after hour.'}
        </p>
        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${showAnswers ? 'min-w-[38rem]' : 'max-w-xl min-w-80'}`}>
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                <th className="py-1.5 pr-3 font-semibold">Station</th>
                <th className="py-1.5 pr-3 font-semibold">Who</th>
                <th className="py-1.5 pr-3 text-right font-semibold">Duration</th>
                <th className="py-1.5 pr-3 text-right font-semibold">Flow</th>
                {showAnswers && (
                  <>
                    <th className="py-1.5 pr-3 text-right font-semibold text-garnet-800">
                      Reaches it
                    </th>
                    <th className="py-1.5 pr-3 text-right font-semibold text-garnet-800">
                      Passes on
                    </th>
                    <th className="py-1.5 text-right font-semibold text-garnet-800">
                      Piles up
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {STATIONS.map((s) => {
                const f = flows.byId[s.id]
                const hot = showAnswers && f.accumulation > 0.005
                const cls = hot ? 'font-semibold text-garnet-800' : 'text-stone-700'
                return (
                  <tr key={s.id} className="border-b border-stone-100 last:border-0">
                    <td className={`py-1 pr-3 ${cls}`}>{s.id}</td>
                    <td className="py-1 pr-3 text-stone-700">{who(s.id)}</td>
                    <td className="py-1 pr-3 text-right text-stone-700">{s.minutes} min / car</td>
                    <td className="py-1 pr-3 text-right text-stone-700">
                      60 ÷ {s.minutes} = {fmt1(capacityPerHour(s))} cars / hr
                    </td>
                    {showAnswers && (
                      <>
                        <td className="py-1 pr-3 text-right text-stone-700">
                          {fmt1(f.inTotal)}
                        </td>
                        <td className="py-1 pr-3 text-right text-stone-700">
                          {fmt1(f.outTotal)}
                        </td>
                        <td className={`py-1 text-right ${cls}`}>
                          {hot ? `+${fmt1(f.accumulation)} / hr` : '—'}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* The answer */}
      {showAnswers && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-lg font-semibold text-stone-900">The answer</h2>

          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-stone-200 p-3">
              <div className="text-xs font-semibold text-stone-500 uppercase">
                Finishes at this mix
              </div>
              <div className="text-xl font-bold text-stone-900 tabular-nums">
                {fmt1(flows.totalThroughput)} cars / hr
              </div>
              <div className="text-xs text-stone-500 tabular-nums">
                {fmt1(flows.throughput.standard)} Standard +{' '}
                {fmt1(flows.throughput.deluxe)} Deluxe, of {fmt1(arriving)} arriving
              </div>
            </div>
            <div
              className={`rounded-lg border p-3 ${flows.totalAccumulation > 0.005 ? 'border-garnet-300 bg-garnet-50/40' : 'border-stone-200'}`}
            >
              <div className="text-xs font-semibold text-stone-500 uppercase">Piles up</div>
              <div
                className={`text-xl font-bold tabular-nums ${flows.totalAccumulation > 0.005 ? 'text-garnet-800' : 'text-stone-900'}`}
              >
                {fmt1(flows.totalAccumulation)} cars / hr
              </div>
              <div className="text-xs text-stone-500">
                {piling.length > 0
                  ? `arrive faster than they can be served; the lines in front of ${piling.map((f) => f.id).join(', ')} grow by this much every hour`
                  : 'no line grows anywhere'}
              </div>
            </div>
            <div className="rounded-lg border border-stone-200 p-3">
              <div className="text-xs font-semibold text-stone-500 uppercase">Capacity</div>
              <div className="text-xl font-bold text-stone-900 tabular-nums">
                {fmt1(SYSTEM_CAPACITY)} cars / hr
              </div>
              <div className="text-xs text-stone-500">
                set by {MIX_LIMITS.total.stationId}, which every car passes.
                Reaching it takes at most {fmt1(MIX_LIMITS.standard.capacity)}{' '}
                Standard ({MIX_LIMITS.standard.stationId}) and{' '}
                {fmt1(MIX_LIMITS.deluxe.capacity)} Deluxe ({MIX_LIMITS.deluxe.stationId})
                per hour, {fmt1(SYSTEM_CAPACITY)} in all
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
            <div className="max-w-xl text-sm leading-relaxed text-stone-600">
              <h3 className="mb-1.5 text-sm font-semibold text-stone-800">
                What the wash can finish
              </h3>
              <p>
                Each leg has a slowest step, and so does the shared stretch
                every car travels. Those three steps write three constraints
                on the output mix: Standard cars per hour at most{' '}
                {fmt1(MIX_LIMITS.standard.capacity)} ({MIX_LIMITS.standard.stationId}),
                Deluxe at most {fmt1(MIX_LIMITS.deluxe.capacity)} (
                {MIX_LIMITS.deluxe.stationId}), and the two together at most{' '}
                {fmt1(MIX_LIMITS.total.capacity)} ({MIX_LIMITS.total.stationId}).
              </p>
              <p className="mt-2">
                The shaded region is every mix that satisfies all three — the
                feasible region, exactly as a linear program would draw it.
                Any mix inside flows through with no line growing. Arrivals
                outside it get pulled back to the edge, and the gap between
                the two points is what piles up. The faster shared steps (
                {STATIONS.filter((s) => servedBy(s.id).length === 2 && s.id !== MIX_LIMITS.total.stationId)
                  .map((s) => s.id)
                  .join(', ')}
                ) sit outside the region: they never bind.
              </p>
            </div>
            <MixChart arrivals={rates} throughput={flows.throughput} max={MAX_RATE} />
          </div>
        </div>
      )}
    </div>
  )
}
