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

/**
 * Validated chart palette (all pairs, on the white card surface). Each step
 * wears its own cool hue so the process chain, the bars, and the
 * calculations line up; the bottleneck turns garnet once answers are shown;
 * waiting is always amber. Text stays in stone ink — a colored mark beside
 * it carries the identity.
 */
const STEP_COLORS = ['#2a78d6', '#0d9488', '#4a3aa7'] as const // blue, teal, violet
const GARNET = '#a52547' // the bottleneck
const AMBER = '#b45309' // waiting
const NEUTRAL = '#57534e' // stone-600 — every step until answers are shown

/** diagonal stripes mark the setup slice, in the step's color */
const setupStyle = (color: string): React.CSSProperties => ({
  background: `repeating-linear-gradient(135deg, ${color} 0px, ${color} 3px, ${color}55 3px, ${color}55 6px)`,
})

const fmt = (v: number) =>
  v.toLocaleString('en-US', { maximumFractionDigits: 1 })
const fmtTakt = (v: number) =>
  v.toLocaleString('en-US', { maximumFractionDigits: 3 })
const fmtInt = (v: number) => v.toLocaleString('en-US')
const round1 = (v: number) => Math.round(v * 10) / 10

/** the breaks as the problem states them — the class wording when there is one */
const breaksText = (sc: Scenario) =>
  sc.breaks ??
  (sc.lunchHours === 0.5
    ? 'a 30-minute lunch break'
    : `a ${fmt(sc.lunchHours)}-hour lunch break`)

/**
 * The color each step wears right now: neutral until answers are shown,
 * then garnet for the bottleneck and blue / teal / violet for the rest in
 * line order. Stable for a given problem — a step only changes hue at the
 * moment of the reveal.
 */
function stepColors(
  sc: Scenario,
  bn: Step,
  showAnswers: boolean,
): Record<string, string> {
  const out: Record<string, string> = {}
  let k = 0
  for (const s of sc.steps) {
    if (!showAnswers) out[s.id] = NEUTRAL
    else if (s.id === bn.id) out[s.id] = GARNET
    else out[s.id] = STEP_COLORS[k++ % STEP_COLORS.length]
  }
  return out
}

/** a colored dot that ties a name or a calculation line to its step */
const Dot = ({ color }: { color: string }) => (
  <span
    className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle"
    style={{ backgroundColor: color }}
  />
)

/** a small triangle that marks a buffer — the same mark as the chain */
const Tri = ({ color }: { color: string }) => (
  <span
    aria-hidden
    className="mr-1.5 inline-block text-[11px] leading-none align-middle"
    style={{ color }}
  >
    ▲
  </span>
)

/** amber VSM inventory triangle with its quantity */
function Buffer({ value, sub }: { value: string; sub: string }) {
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

/** a process step in the chain, tagged with its color along the top edge */
function StepBox({
  step,
  color,
  isBottleneck,
}: {
  step: Step
  color: string
  isBottleneck: boolean
}) {
  return (
    <span
      className="flex flex-col rounded-lg border border-stone-300 bg-stone-50 px-3 py-1.5 text-center"
      style={{ borderTopWidth: 3, borderTopColor: color }}
    >
      <span className="text-sm font-semibold text-stone-900">{step.name}</span>
      <span className="text-xs text-stone-600 tabular-nums">
        {step.cycleSec} s/pc
      </span>
      <span className="text-xs text-stone-500 tabular-nums">
        {step.setupMin > 0 ? `${step.setupMin} min setup` : 'no setup'}
      </span>
      {isBottleneck && (
        <span className="text-[10px] font-semibold tracking-wide text-garnet-800 uppercase">
          bottleneck
        </span>
      )}
    </span>
  )
}

/**
 * The problem in the format of the lecture slides, the book, and the
 * homework: overall attributes, then one row per process step, then a
 * shipping row for the finished goods. Uptime and operators are fixed in
 * every problem this course uses, so they are stated, not modeled.
 */
function ProblemTable({ sc }: { sc: Scenario }) {
  const last = sc.steps[sc.steps.length - 1]
  const th = 'w-44 border border-stone-300 px-3 py-2 text-left font-bold'
  const td = 'border border-stone-300 px-3 py-2'
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-sm text-stone-900 tabular-nums">
        <tbody>
          <tr>
            <th scope="row" className={`${th} align-bottom`}>
              Overall Process Attributes
            </th>
            <td className={`${td} font-semibold`}>
              <span className="block">
                Average demand: {fmtInt(sc.weeklyDemand)}/week
              </span>
              <span className="block">Batch size: {sc.batchSize}</span>
              <span className="block">Number of shifts per day: 1</span>
              <span className="block">
                Number of operating days per week: {sc.daysPerWeek}
              </span>
              <span className="block">
                Availability: {sc.shiftHours} hours per shift with{' '}
                {breaksText(sc)}
              </span>
            </td>
          </tr>
          {sc.steps.map((s, i) => (
            <tr key={s.id}>
              <th scope="row" className={`${th} align-top`}>
                Process Step {i + 1}
              </th>
              <td className={`${td} align-top`}>
                <div className="grid grid-cols-[7.5rem_1fr] gap-x-3">
                  <span className="font-bold">{s.name}</span>
                  <span>
                    <span className="block">Cycle time = {s.cycleSec} seconds</span>
                    <span className="block">Setup time = {s.setupMin} minutes</span>
                    <span className="block">Uptime = 100%</span>
                    <span className="block">Operators = 1</span>
                    <span className="block">
                      WIP ={' '}
                      {i === 0
                        ? `${fmt(sc.rawMaterialDays)} days of raw material`
                        : `${fmtInt(s.wipBefore ?? 0)} pieces`}{' '}
                      (Before {s.name})
                    </span>
                  </span>
                </div>
              </td>
            </tr>
          ))}
          <tr>
            <th scope="row" className={`${th} align-top`}>
              Process Step {sc.steps.length + 1}
            </th>
            <td className={`${td} align-top`}>
              <div className="grid grid-cols-[7.5rem_1fr] gap-x-3">
                <span className="font-bold">Shipping</span>
                <span>
                  WIP = {fmtInt(sc.wipAfterLast)} pieces (After {last.name})
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/**
 * One worked line: the name, then the formula in words, then the numbers
 * with their units, then the answer — every "=" step spelled out.
 */
function Calc({
  mark,
  name,
  formula,
  work,
  result,
  resultSign = '=',
  note,
}: {
  mark?: React.ReactNode
  name: React.ReactNode
  formula?: string
  work?: React.ReactNode | React.ReactNode[]
  result: React.ReactNode
  resultSign?: string
  note?: string
}) {
  const steps = work === undefined ? [] : Array.isArray(work) ? work : [work]
  return (
    <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-[13rem_1fr]">
      <span className="font-medium text-stone-900">
        {mark}
        {name}
      </span>
      <span className="text-stone-700">
        {formula && <span className="text-stone-500">= {formula} </span>}
        {steps.map((w, i) => (
          <span key={i}>= {w} </span>
        ))}
        <span className="font-semibold text-stone-900">
          {resultSign} {result}
        </span>
        {note && <span className="text-stone-500"> {note}</span>}
      </span>
    </div>
  )
}

/** the calculations grouped under the same headline as the box they explain */
function CalcGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-widest text-stone-500 uppercase">
        {title}
      </p>
      {children}
    </div>
  )
}

/**
 * One column of the line diagram. The process chain and the lead-time
 * ladder share these columns, so a step's box and its lowered rung are
 * exactly the same width and each buffer sits directly over its raised
 * rung; the raised line simply continues under the arrows.
 */
type Col =
  | { kind: 'buffer'; key: string; value: string; sub: string; days: string; hidden: boolean }
  | { kind: 'step'; key: string; step: Step; color: string; isBottleneck: boolean }
  | { kind: 'arrow'; key: string }

export default function Ch5LeanSystems() {
  const [sc, setSc] = useState<Scenario>(CLASS_SCENARIO)
  const [isClass, setIsClass] = useState(true)
  const [showAnswers, setShowAnswers] = useState(true)
  const [showTable, setShowTable] = useState(false)

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
  const keepsUp = cap >= daily
  const colors = stepColors(sc, bn, showAnswers)
  /** all bars and the takt line share this scale, from zero — the same in
   *  both modes, so on reveal the bars grow by their setup share instead
   *  of rescaling */
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

  // the line diagram's columns, in flow order: buffer, arrow, step, arrow, …, buffer
  const cols: Col[] = [
    {
      kind: 'buffer',
      key: 'raw',
      value: `${fmt(sc.rawMaterialDays)} days`,
      sub: 'raw material',
      days: `${fmt(sc.rawMaterialDays)} days`,
      hidden: false,
    },
  ]
  sc.steps.forEach((s, i) => {
    const last = i === sc.steps.length - 1
    cols.push({ kind: 'arrow', key: `${s.id}-in` })
    cols.push({
      kind: 'step',
      key: s.id,
      step: s,
      color: colors[s.id],
      isBottleneck: showAnswers && s.id === bn.id,
    })
    cols.push({ kind: 'arrow', key: `${s.id}-out` })
    cols.push({
      kind: 'buffer',
      key: `${s.id}-buffer`,
      value: last
        ? `${fmtInt(sc.wipAfterLast)} pcs`
        : `${fmtInt(sc.steps[i + 1].wipBefore ?? 0)} pcs`,
      sub: last ? 'to ship' : 'waiting',
      days: `${fmt(round1(segments[i + 1]))} days`,
      hidden: !showAnswers, // computed from WIP — practice material
    })
  })
  /** boxes and buffers grow to fill the width; arrows and the totals don't */
  const gridTemplateColumns = [
    ...cols.map((c) =>
      c.kind === 'arrow'
        ? 'max-content'
        : c.kind === 'step'
          ? 'minmax(max-content, 1.4fr)'
          : 'minmax(max-content, 1fr)',
    ),
    'max-content',
  ].join(' ')

  const verdict = keepsUp
    ? {
        label: 'Keeps up',
        cls: 'text-teal-700',
        detail: `${bn.name} needs ${fmt(bnPer)} s per piece against a takt of ${fmtTakt(takt)} s per piece — capacity of ${fmt(cap)} pieces a day covers demand of ${fmtInt(daily)} pieces a day.`,
      }
    : {
        label: 'Can’t keep up',
        cls: 'text-garnet-800',
        detail: `${bn.name} needs ${fmt(bnPer)} s per piece but takt allows only ${fmtTakt(takt)} s per piece — capacity of ${fmt(cap)} pieces a day falls short of demand of ${fmtInt(daily)} pieces a day.`,
      }

  /** the waiting total, each buffer marked with its triangle */
  const waitSum = (
    <>
      {segments.map((d, i) => (
        <span key={i}>
          {i > 0 && ' + '}
          <Tri color={AMBER} />
          {fmt(round1(d))} days
        </span>
      ))}
    </>
  )

  /** the working total, each term in its step's color */
  const workSum = (
    <>
      {sc.steps.map((s, i) => (
        <span key={s.id}>
          {i > 0 && ' + '}
          <Dot color={colors[s.id]} />
          {s.cycleSec} s
        </span>
      ))}
    </>
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DemoHeader label="Chapter 5 · Lean Systems" title="Seconds of Work, Days of Waiting">
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

      {/* The problem — the givens, with the slide-format table on request */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-stone-900">The problem</h2>
          <button
            onClick={() => setShowTable((v) => !v)}
            aria-pressed={showTable}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            {showTable ? 'Hide table' : 'View table'}
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 tabular-nums">
          {(
            [
              ['Weekly', 'demand', `${fmtInt(sc.weeklyDemand)} pieces`],
              ['Batch', 'size', `${sc.batchSize} pieces`],
              ['Shifts', 'per day', '1'],
              ['Work', 'days', `${sc.daysPerWeek}/wk`],
              ['Shift', 'length', `${sc.shiftHours} h − ${fmt(sc.lunchHours)} h lunch`],
            ] as const
          ).map(([top, bottom, value]) => (
            <span key={bottom}>
              <span className="flex h-8 flex-col justify-end text-xs leading-4 font-semibold text-stone-500 uppercase">
                <span>{top}</span>
                <span>{bottom}</span>
              </span>
              <span className="text-lg text-stone-700">{value}</span>
            </span>
          ))}
        </div>
        {showTable && (
          <div className="mt-4 border-t border-stone-100 pt-4">
            <p className="mb-2 text-xs text-stone-500">
              As the slides, the book, and the homework state it.
            </p>
            <ProblemTable sc={sc} />
          </div>
        )}
      </div>

      {/* The line — the chain and the lead-time ladder */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-1 text-lg font-semibold text-stone-900">The line</h2>
        <p className="mb-4 text-sm text-stone-600">
          The process chain, and how long one piece waits versus works on its
          way through.
        </p>

        {/* the line diagram: process chain on top, lead-time ladder beneath,
            one shared column per buffer, arrow, and step */}
        <div className="overflow-x-auto">
          <div className="grid gap-y-3" style={{ gridTemplateColumns }}>
            {/* row 1: inventory triangles alternating with step boxes */}
            {cols.map((c) =>
              c.kind === 'buffer' ? (
                <span key={c.key} className="self-center">
                  <Buffer value={c.value} sub={c.sub} />
                </span>
              ) : c.kind === 'step' ? (
                <StepBox
                  key={c.key}
                  step={c.step}
                  color={c.color}
                  isBottleneck={c.isBottleneck}
                />
              ) : (
                <span
                  key={c.key}
                  aria-hidden
                  className="self-center px-1.5 text-stone-400"
                >
                  →
                </span>
              ),
            )}
            <span />

            {/* row 2: high rungs wait in days, low rungs work in seconds */}
            {cols.map((c) =>
              c.kind === 'buffer' ? (
                <div key={c.key}>
                  <div className="h-5 text-center text-xs font-semibold text-stone-700 tabular-nums">
                    {c.hidden ? (
                      <span className="font-normal text-stone-400">? days</span>
                    ) : (
                      c.days
                    )}
                  </div>
                  <div className="h-8 border-t-4" style={{ borderColor: AMBER }} />
                  <div className="h-5" />
                </div>
              ) : c.kind === 'step' ? (
                <div key={c.key}>
                  <div className="h-5" />
                  <div
                    className="h-8 border-x-4 border-b-4"
                    style={{ borderColor: c.color }}
                  />
                  <div className="h-5 pt-1 text-center text-xs font-semibold text-stone-700 tabular-nums">
                    {c.step.cycleSec} s
                  </div>
                </div>
              ) : (
                <div key={c.key}>
                  <div className="h-5" />
                  <div className="h-8 border-t-4" style={{ borderColor: AMBER }} />
                  <div className="h-5" />
                </div>
              ),
            )}
            <div className="flex flex-col justify-between py-0.5 pl-3 text-right text-sm font-semibold text-stone-800 tabular-nums">
              <span>
                <Tri color={AMBER} />
                {showAnswers ? (
                  `${fmt(waitTotal)} days waiting`
                ) : (
                  <span className="font-normal text-stone-400">? days waiting</span>
                )}
              </span>
              <span>{fmtInt(workTotal)} s working</span>
            </div>
          </div>
        </div>
      </div>

      {/* One cycle — time per piece at each step against takt. With answers
          hidden, only the given cycle times are drawn: the setup share and
          the takt line are the student's to work out. */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-stone-900">One cycle</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-4 rounded-sm"
                style={{ backgroundColor: NEUTRAL }}
              />
              cycle time
            </span>
            {showAnswers && anySetups && (
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-4 rounded-sm"
                  style={setupStyle(NEUTRAL)}
                />
                setup share per piece
              </span>
            )}
            {showAnswers && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-0 border-l-2 border-dashed border-stone-500" />
                takt
              </span>
            )}
          </div>
        </div>
        <p className="mb-4 text-sm text-stone-600">
          How long one piece takes at each step — its cycle time plus its share
          of the setup — against the takt time the line has to hold.
        </p>
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
                  takt = {fmtTakt(takt)} s
                </span>
              )}
            </div>
            <span />
          </div>
          {sc.steps.map((s) => {
            const per = perUnitSec(s, sc.batchSize)
            const isBn = showAnswers && s.id === bn.id
            const setupShare = (s.setupMin * 60) / sc.batchSize
            const color = colors[s.id]
            /** the bar shows the whole per-piece time once revealed, only the
             *  given cycle time before that */
            const drawn = showAnswers ? per : s.cycleSec
            return (
              <div
                key={s.id}
                className="grid grid-cols-[8.5rem_1fr_5rem] items-center gap-3"
              >
                <span className="flex flex-col text-sm leading-tight">
                  <span
                    className={`text-stone-800 ${isBn ? 'font-semibold' : 'font-medium'}`}
                  >
                    <Dot color={color} />
                    {s.name}
                  </span>
                  {isBn && (
                    <span className="text-[10px] font-semibold tracking-wide text-garnet-800 uppercase">
                      bottleneck
                    </span>
                  )}
                </span>
                <div className="relative h-6">
                  <div
                    className="flex h-full gap-[2px] overflow-hidden rounded-r"
                    style={{ width: `${(drawn / scaleMax) * 100}%` }}
                  >
                    <div
                      title={`${s.name} — cycle time: ${s.cycleSec} s per piece`}
                      style={{
                        width: `${(s.cycleSec / drawn) * 100}%`,
                        backgroundColor: color,
                      }}
                    />
                    {showAnswers && s.setupMin > 0 && (
                      <div
                        title={`${s.name} — setup share: ${fmt(setupShare)} s per piece`}
                        style={{
                          width: `${(setupShare / per) * 100}%`,
                          ...setupStyle(color),
                        }}
                      />
                    )}
                  </div>
                  {showAnswers && (
                    <div
                      className="absolute inset-y-0 w-0 border-l-2 border-dashed border-stone-500"
                      style={{ left: `${(takt / scaleMax) * 100}%` }}
                    />
                  )}
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

      {/* The calculations — same headlines as the boxes above */}
      {showAnswers && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
          <h2 className="mb-1 text-lg font-semibold text-stone-900">
            The calculations
          </h2>
          <p className="mb-4 text-sm text-stone-600">
            Each line reads the same way: the formula in words, then the
            numbers with their units, then the answer.
          </p>
          <div className="space-y-6 text-sm tabular-nums">
            <CalcGroup title="The line">
              <Calc
                name="Daily demand"
                formula="weekly demand ÷ work days"
                work={`${fmtInt(sc.weeklyDemand)} pieces/week ÷ ${sc.daysPerWeek} days/week`}
                result={`${fmtInt(daily)} pieces/day`}
              />
              <Calc
                name="Available time"
                formula="(shift − lunch) × 3,600 s/h"
                work={`(${sc.shiftHours} h − ${fmt(sc.lunchHours)} h) × 3,600 s/h`}
                result={`${fmtInt(avail)} s/day`}
              />
              <Calc
                mark={<Tri color={AMBER} />}
                name="Raw material wait"
                result={`${fmt(sc.rawMaterialDays)} days`}
                note="(given)"
              />
              {sc.steps.slice(1).map((s, i) => (
                <Calc
                  key={s.id}
                  mark={<Tri color={AMBER} />}
                  name={`Wait before ${s.name}`}
                  formula="pieces waiting ÷ daily demand"
                  work={`${fmtInt(s.wipBefore ?? 0)} pieces ÷ ${fmtInt(daily)} pieces/day`}
                  result={`${fmt(round1(segments[i + 1]))} days`}
                />
              ))}
              <Calc
                mark={<Tri color={AMBER} />}
                name="Finished goods wait"
                formula="pieces waiting ÷ daily demand"
                work={`${fmtInt(sc.wipAfterLast)} pieces ÷ ${fmtInt(daily)} pieces/day`}
                result={`${fmt(round1(segments[segments.length - 1]))} days`}
              />
              <Calc
                name="Total waiting"
                formula="every wait, added up"
                work={waitSum}
                result={`${fmt(waitTotal)} days`}
              />
              <Calc
                name="Total working"
                formula="every cycle time, added up"
                work={workSum}
                result={`${fmtInt(workTotal)} s`}
              />
            </CalcGroup>

            <CalcGroup title="One cycle">
              <Calc
                name="Takt time"
                formula="available time ÷ daily demand"
                work={`${fmtInt(avail)} s/day ÷ ${fmtInt(daily)} pieces/day`}
                result={`${fmtTakt(takt)} s/piece`}
              />
              {sc.steps.map((s) => {
                const share = (s.setupMin * 60) / sc.batchSize
                return (
                  <Calc
                    key={s.id}
                    mark={<Dot color={colors[s.id]} />}
                    name={s.name}
                    formula="cycle time + setup time ÷ batch size"
                    work={[
                      `${s.cycleSec} s + (${s.setupMin} min × 60 s/min) ÷ ${sc.batchSize} pieces`,
                      `${s.cycleSec} s + ${fmt(share)} s`,
                    ]}
                    result={`${fmt(perUnitSec(s, sc.batchSize))} s/piece`}
                    note={s.setupMin === 0 ? '(no setup)' : undefined}
                  />
                )
              })}
              <Calc
                mark={<Dot color={GARNET} />}
                name="Bottleneck"
                formula="the step with the largest time per piece"
                result={`${bn.name}, ${fmt(bnPer)} s/piece`}
              />
              <Calc
                name="Capacity"
                formula="available time ÷ bottleneck time per piece"
                work={`${fmtInt(avail)} s/day ÷ ${fmt(bnPer)} s/piece`}
                result={`${fmt(cap)} pieces/day`}
              />
              <Calc
                name="Keeps up?"
                formula="capacity against daily demand"
                work={`${fmt(cap)} pieces/day ${keepsUp ? '≥' : '<'} ${fmtInt(daily)} pieces/day`}
                resultSign="→"
                result={<span className={verdict.cls}>{verdict.label}</span>}
              />
            </CalcGroup>
          </div>
        </div>
      )}
    </div>
  )
}
