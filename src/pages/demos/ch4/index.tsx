import { useEffect, useState } from 'react'
import DemoHeader from '../../../components/DemoHeader'
import {
  CLASS_SCENARIO,
  bottleneck,
  capacityPerDay,
  dailyAvailSec,
  dailyDemand,
  leadSegmentsDays,
  perUnitSec,
  randomScenario,
  taktSec,
  totalProcessingSec,
  type Scenario,
  type Step,
} from '../../../lib/vsm'

/** validated chart palette — blue for working time, amber for waiting */
const BLUE = '#1d4ed8'
const AMBER = '#b45309'

/** diagonal stripes mark the setup slice, in the work color */
const setupStyle = (color: string): React.CSSProperties => ({
  background: `repeating-linear-gradient(135deg, ${color} 0px, ${color} 3px, ${color}55 3px, ${color}55 6px)`,
})

const fmt = (v: number) =>
  v.toLocaleString('en-US', { maximumFractionDigits: 1 })
const fmt1 = (v: number) => v.toFixed(1)
const fmtInt = (v: number) => v.toLocaleString('en-US')
const round1 = (v: number) => Math.round(v * 10) / 10

/** amber VSM inventory triangle with its quantity */
function Buffer({
  value,
  sub,
}: {
  value: string
  sub: string
}) {
  return (
    <span className="flex flex-col items-center px-1 text-center">
      <span aria-hidden className="text-xl leading-none" style={{ color: AMBER }}>
        ▲
      </span>
      <span className="text-xs font-semibold text-stone-800 tabular-nums">
        {value}
      </span>
      <span className="text-[10px] text-stone-500">{sub}</span>
    </span>
  )
}

function StepBox({ step }: { step: Step }) {
  return (
    <span className="flex flex-col rounded-lg border border-stone-300 bg-stone-50 px-3 py-1.5 text-center">
      <span className="text-sm font-semibold text-stone-900">{step.name}</span>
      <span className="text-xs text-stone-600 tabular-nums">
        {step.cycleSec} s/pc
      </span>
      <span className="text-xs text-stone-500 tabular-nums">
        {step.setupMin > 0 ? `${step.setupMin} min setup` : 'no setup'}
      </span>
    </span>
  )
}

export default function Ch4LeanSystems() {
  const [sc, setSc] = useState<Scenario>(CLASS_SCENARIO)
  const [isClass, setIsClass] = useState(true)
  const [showAnswers, setShowAnswers] = useState(true)

  useEffect(() => {
    document.title = 'Lean Systems · MGSC 395'
    return () => {
      document.title = 'MGSC 395 · Interactive Demos'
    }
  }, [])

  const daily = dailyDemand(sc)
  const avail = dailyAvailSec(sc)
  const takt = taktSec(sc)
  const bn = bottleneck(sc)
  const bnPer = perUnitSec(bn, sc.batchSize)
  const cap = capacityPerDay(sc)
  const segments = leadSegmentsDays(sc)
  const waitTotal = segments.reduce((a, b) => a + round1(b), 0)
  const workTotal = totalProcessingSec(sc)
  const anySetups = sc.steps.some((s) => s.setupMin > 0)
  /** all beat bars and the takt line share this scale, from zero */
  const scaleMax =
    Math.max(takt, ...sc.steps.map((s) => perUnitSec(s, sc.batchSize))) * 1.08

  const backToClass = () => {
    setSc(CLASS_SCENARIO)
    setIsClass(true)
    setShowAnswers(true)
  }

  const makeRandom = () => {
    setSc(randomScenario())
    setIsClass(false)
    setShowAnswers(false)
  }

  // ladder segments, in flow order: wait, work, wait, work, …, wait
  const ladder: {
    key: string
    kind: 'wait' | 'work'
    label: string
    hidden?: boolean
  }[] = []
  ladder.push({
    key: 'raw',
    kind: 'wait',
    label: `${fmt(sc.rawMaterialDays)} days`,
  })
  sc.steps.forEach((s, i) => {
    ladder.push({ key: `${s.id}w`, kind: 'work', label: `${s.cycleSec} s` })
    ladder.push({
      key: `${s.id}b`,
      kind: 'wait',
      label: `${fmt(round1(segments[i + 1]))} days`,
      hidden: !showAnswers, // computed from WIP — practice material
    })
  })

  const verdict =
    cap >= daily
      ? {
          label: 'Keeps up',
          cls: 'text-teal-700',
          detail: `${bn.name} needs ${fmt(bnPer)} s per piece against a ${fmt1(takt)} s beat — capacity ${fmt(cap)} a day covers demand of ${fmtInt(daily)}.`,
        }
      : {
          label: 'Can’t keep up',
          cls: 'text-garnet-800',
          detail: `${bn.name} needs ${fmt(bnPer)} s per piece but the beat allows only ${fmt1(takt)} s — capacity ${fmt(cap)} a day falls short of demand of ${fmtInt(daily)}.`,
        }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DemoHeader label="Chapter 4 · Lean Systems" title="Seconds of Work, Days of Waiting">
        Walk one part down the line and see how little of its journey is
        actual work — then check whether the slowest step can hold the beat.
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
        <button
          onClick={makeRandom}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Create a random problem
        </button>
        <button
          onClick={backToClass}
          disabled={isClass}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
        >
          Back to class data
        </button>
      </div>

      {/* The line — read-only givens */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold text-stone-900">The line</h2>
        <div className="mb-4 flex flex-wrap items-end gap-x-6 gap-y-3 tabular-nums">
          {(
            [
              ['Weekly', 'demand', `${fmtInt(sc.weeklyDemand)} pieces`],
              ['Work', 'days', `${sc.daysPerWeek}/wk`],
              ['', 'Shift', `${sc.shiftHours} h − ${fmt(sc.lunchHours)} h lunch`],
              ['Available', 'time', `${fmtInt(avail)} s/day`],
              ['Batch', 'size', `${sc.batchSize} pieces`],
            ] as const
          ).map(([top, bottom, value]) => (
            <span key={bottom}>
              <span className="flex h-8 flex-col justify-end text-xs leading-4 font-semibold text-stone-500 uppercase">
                {top !== '' && <span>{top}</span>}
                <span>{bottom}</span>
              </span>
              <span className="text-lg text-stone-700">{value}</span>
            </span>
          ))}
        </div>

        {/* process chain: inventory triangles alternating with step boxes */}
        <div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-3">
          <Buffer value={`${fmt(sc.rawMaterialDays)} days`} sub="raw material" />
          {sc.steps.map((s, i) => (
            <span key={s.id} className="flex items-center gap-x-2">
              <span aria-hidden className="text-stone-400">→</span>
              <StepBox step={s} />
              <span aria-hidden className="text-stone-400">→</span>
              {i < sc.steps.length - 1 ? (
                <Buffer
                  value={`${fmtInt(sc.steps[i + 1].wipBefore ?? 0)} pcs`}
                  sub="waiting"
                />
              ) : (
                <Buffer value={`${fmtInt(sc.wipAfterLast)} pcs`} sub="to ship" />
              )}
            </span>
          ))}
        </div>

        {/* lead-time ladder: high rungs wait in days, low rungs work in seconds */}
        <div className="overflow-x-auto">
          <div className="flex min-w-[36rem] items-stretch gap-x-3">
            <div className="flex grow">
              {ladder.map((seg) =>
                seg.kind === 'wait' ? (
                  <div key={seg.key} className="min-w-14 flex-[1.4]">
                    <div
                      className="h-5 text-center text-xs font-semibold tabular-nums"
                      style={{ color: AMBER }}
                    >
                      {seg.hidden ? (
                        <span className="font-normal text-stone-400">? days</span>
                      ) : (
                        seg.label
                      )}
                    </div>
                    <div className="h-8 border-t-2 border-stone-400" />
                    <div className="h-5" />
                  </div>
                ) : (
                  <div key={seg.key} className="min-w-10 flex-1">
                    <div className="h-5" />
                    <div className="h-8 border-x-2 border-b-2 border-stone-400" />
                    <div
                      className="h-5 pt-1 text-center text-xs font-semibold tabular-nums"
                      style={{ color: BLUE }}
                    >
                      {seg.label}
                    </div>
                  </div>
                ),
              )}
            </div>
            <div className="flex shrink-0 flex-col justify-between py-0.5 text-right text-sm font-semibold tabular-nums">
              <span style={{ color: AMBER }}>
                {showAnswers ? (
                  `${fmt(waitTotal)} days waiting`
                ) : (
                  <span className="font-normal text-stone-400">? days waiting</span>
                )}
              </span>
              <span style={{ color: BLUE }}>{fmtInt(workTotal)} s working</span>
            </div>
          </div>
        </div>
      </div>

      {/* The beat — per-unit time at each step against takt */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-stone-900">The beat</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-4 rounded-sm"
                style={{ backgroundColor: BLUE }}
              />
              cycle time
            </span>
            {anySetups && (
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-4 rounded-sm"
                  style={setupStyle(BLUE)}
                />
                setup share per piece
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-0 border-l-2 border-dashed border-stone-500" />
              takt
            </span>
          </div>
        </div>
        <div className="space-y-2.5">
          {/* takt label sits above the bars, at the line's position */}
          <div className="grid grid-cols-[8.5rem_1fr_5rem] items-center gap-3">
            <span />
            <div className="relative h-4">
              {showAnswers && (
                <span
                  className="absolute -translate-x-1/2 text-xs font-semibold whitespace-nowrap text-stone-600 tabular-nums"
                  style={{ left: `${(takt / scaleMax) * 100}%` }}
                >
                  takt = {fmt1(takt)} s
                </span>
              )}
            </div>
            <span />
          </div>
          {sc.steps.map((s) => {
            const per = perUnitSec(s, sc.batchSize)
            const isBn = showAnswers && s.id === bn.id
            const setupShare = (s.setupMin * 60) / sc.batchSize
            return (
              <div
                key={s.id}
                className="grid grid-cols-[8.5rem_1fr_5rem] items-center gap-3"
              >
                <span
                  className={`text-sm ${isBn ? 'font-semibold text-garnet-800' : 'font-medium text-stone-800'}`}
                >
                  {s.name}
                </span>
                <div className="relative h-6">
                  <div
                    className={`flex h-full overflow-hidden rounded ${isBn ? 'ring-2 ring-garnet-600' : ''}`}
                    style={{ width: `${(per / scaleMax) * 100}%` }}
                  >
                    <div
                      title={`${s.name} — cycle: ${s.cycleSec} s`}
                      style={{
                        width: `${(s.cycleSec / per) * 100}%`,
                        backgroundColor: BLUE,
                      }}
                    />
                    {s.setupMin > 0 && (
                      <div
                        title={`${s.name} — setup share: ${fmt(setupShare)} s per piece`}
                        style={{
                          width: `${(setupShare / per) * 100}%`,
                          ...setupStyle(BLUE),
                        }}
                      />
                    )}
                  </div>
                  <div
                    className="absolute inset-y-0 w-0 border-l-2 border-dashed border-stone-500"
                    style={{ left: `${(takt / scaleMax) * 100}%` }}
                  />
                </div>
                <span className="text-right text-xs font-semibold text-stone-700 tabular-nums">
                  {showAnswers ? `${fmt(per)} s/pc` : ''}
                </span>
              </div>
            )
          })}
        </div>
        {showAnswers && (
          <div className="mt-4 border-t border-stone-100 pt-3">
            <span className={`text-sm font-bold ${verdict.cls}`}>
              {verdict.label}
            </span>
            <span className="ml-2 text-sm text-stone-600">{verdict.detail}</span>
          </div>
        )}
      </div>

      {/* The calculations */}
      {showAnswers && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-lg font-semibold text-stone-900">
            The calculations
          </h2>
          <div className="space-y-4 text-sm text-stone-700 tabular-nums">
            <div className="space-y-1.5">
              <p>
                Daily demand = {fmtInt(sc.weeklyDemand)} / {sc.daysPerWeek} ={' '}
                {fmtInt(daily)} pieces
              </p>
              <p>
                Availability = ({sc.shiftHours} − {fmt(sc.lunchHours)}) × 3,600 ={' '}
                {fmtInt(avail)} s per day
              </p>
              <p>
                Takt = {fmtInt(avail)} / {fmtInt(daily)} ={' '}
                {takt.toLocaleString('en-US', { maximumFractionDigits: 3 })} s
                per piece
              </p>
            </div>
            <div className="space-y-1.5">
              {sc.steps.map((s) => (
                <p key={s.id}>
                  {s.name} ={' '}
                  {s.setupMin > 0
                    ? `${s.cycleSec} + (${s.setupMin} × 60) / ${sc.batchSize} = ${fmt(perUnitSec(s, sc.batchSize))} s`
                    : `${s.cycleSec} s (no setup)`}
                </p>
              ))}
              <p className="font-semibold text-stone-900">
                Bottleneck = {bn.name} at {fmt(bnPer)} s per piece
              </p>
              <p>
                Capacity = {fmtInt(avail)} / {fmt(bnPer)} = {fmt(cap)} units/day
              </p>
            </div>
            <div className="space-y-1.5">
              <p>Raw material = {fmt(sc.rawMaterialDays)} days</p>
              {sc.steps.slice(1).map((s, i) => (
                <p key={s.id}>
                  Before {s.name} = {fmtInt(s.wipBefore ?? 0)} / {fmtInt(daily)}{' '}
                  = {fmt(round1(segments[i + 1]))} days
                </p>
              ))}
              <p>
                Finished goods = {fmtInt(sc.wipAfterLast)} / {fmtInt(daily)} ={' '}
                {fmt(round1(segments[segments.length - 1]))} days
              </p>
              <p className="font-semibold text-stone-900">
                Total = {segments.map((d) => fmt(round1(d))).join(' + ')} ={' '}
                {fmt(waitTotal)} days vs total processing{' '}
                {sc.steps.map((s) => s.cycleSec).join(' + ')} = {fmtInt(workTotal)} s
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
