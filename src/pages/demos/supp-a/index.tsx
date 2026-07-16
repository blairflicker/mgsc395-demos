import { useEffect, useState } from 'react'
import DemoHeader from '../../../components/DemoHeader'
import {
  CLASS_COMPARE,
  CLASS_SINGLE,
  buyCostAt,
  chartMax,
  chartStep,
  contribution,
  costAt,
  makeCostAt,
  profitAt,
  qBreakEven,
  qIndifference,
  randomCompare,
  randomSingle,
  revenueAt,
  type CompareCase,
  type SingleCase,
} from '../../../lib/breakeven'
import { BreakEvenChart } from './BreakEvenChart'
import { COLOR_BUY, COLOR_COST, COLOR_MAKE, COLOR_REVENUE } from './palette'

/** integers as-is, fractions to at most `dp` places — 1,061.9 stays "1,061.9" */
const fmtNum = (v: number, dp = 1) =>
  v.toLocaleString('en-US', { maximumFractionDigits: dp })

const money = (v: number) => {
  const r = Math.round(v * 100) / 100
  return Number.isInteger(r)
    ? `$${r.toLocaleString('en-US')}`
    : `$${r.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

/** always two decimal places — "$544.00" */
const money2 = (v: number) =>
  `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** per-unit costs may carry cents or mills — $100, $0.68, $0.163 */
const moneyUnit = (v: number) => {
  if (Number.isInteger(v)) return `$${v.toLocaleString('en-US')}`
  return Math.round(v * 100) === v * 100
    ? `$${v.toFixed(2)}`
    : `$${v.toFixed(3)}`
}

/** the chosen-Q line starts at 60% of the axis, snapped to the drag step */
const defaultQ = (xMax: number, step: number) =>
  Math.min(xMax, Math.max(0, Math.round((0.6 * xMax) / step) * step))

/** a colored dot that ties a calculation line to its chart color */
const Dot = ({ color }: { color: string }) => (
  <span
    className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
    style={{ backgroundColor: color }}
  />
)

type Mode = 'single' | 'compare'

export default function SuppABreakEven() {
  const [mode, setMode] = useState<Mode>('single')
  const [single, setSingle] = useState<SingleCase>({ ...CLASS_SINGLE })
  const [compare, setCompare] = useState<CompareCase>({ ...CLASS_COMPARE })
  const [qSingle, setQSingle] = useState(() => {
    const xMax = chartMax(qBreakEven(CLASS_SINGLE))
    return defaultQ(xMax, chartStep(xMax))
  })
  const [qCompare, setQCompare] = useState(() => {
    const xMax = chartMax(qIndifference(CLASS_COMPARE))
    return defaultQ(xMax, chartStep(xMax))
  })
  const [showAnswers, setShowAnswers] = useState(true)

  useEffect(() => {
    document.title = 'Break-Even Analysis · MGSC 395'
    return () => {
      document.title = 'MGSC 395 · Interactive Demos'
    }
  }, [])

  const cm = contribution(single)
  const qbe = qBreakEven(single)
  const xMaxSingle = chartMax(qbe)
  const stepSingle = chartStep(xMaxSingle)
  const profit = profitAt(single, qSingle)

  const qInd = qIndifference(compare)
  const xMaxCompare = chartMax(qInd)
  const stepCompare = chartStep(xMaxCompare)
  const makeAtQ = makeCostAt(compare, qCompare)
  const buyAtQ = buyCostAt(compare, qCompare)
  const vDiff = Math.round((compare.varBuy - compare.varMake) * 1000) / 1000
  const fDiff = compare.fixedMake - compare.fixedBuy

  // ── practice toolbar ────────────────────────────────────
  const isClass =
    single.price === CLASS_SINGLE.price &&
    single.varCost === CLASS_SINGLE.varCost &&
    single.fixed === CLASS_SINGLE.fixed &&
    compare.fixedMake === CLASS_COMPARE.fixedMake &&
    compare.varMake === CLASS_COMPARE.varMake &&
    compare.fixedBuy === CLASS_COMPARE.fixedBuy &&
    compare.varBuy === CLASS_COMPARE.varBuy

  const applyCases = (s: SingleCase, c: CompareCase) => {
    setSingle(s)
    setCompare(c)
    const xs = chartMax(qBreakEven(s))
    setQSingle(defaultQ(xs, chartStep(xs)))
    const xc = chartMax(qIndifference(c))
    setQCompare(defaultQ(xc, chartStep(xc)))
  }

  const backToClass = () => {
    applyCases({ ...CLASS_SINGLE }, { ...CLASS_COMPARE })
  }
  const makeRandom = () => {
    applyCases(randomSingle(), randomCompare())
    setShowAnswers(false)
  }

  const setChosenSingle = (value: number) => {
    if (!Number.isFinite(value)) return
    setQSingle(Math.min(xMaxSingle, Math.max(0, Math.round(value))))
  }
  const setChosenCompare = (value: number) => {
    if (!Number.isFinite(value)) return
    setQCompare(Math.min(xMaxCompare, Math.max(0, Math.round(value))))
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DemoHeader label="Supplement A · Break-Even Analysis" title="Where Lines Cross">
        Drag the dashed line to pick a volume and watch what happens on
        either side of the crossing.
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

      {/* One process vs. two processes */}
      <div className="mb-4 flex overflow-hidden rounded-lg border border-stone-300 text-sm">
        {(
          [
            ['single', 'One process'],
            ['compare', 'Two processes — make or buy'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            aria-pressed={mode === value}
            className={
              mode === value
                ? 'bg-garnet-800 px-4 py-2 font-medium text-white'
                : 'bg-white px-4 py-2 text-stone-700 hover:bg-stone-50'
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* One process — revenue vs total cost */}
      {mode === 'single' && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-end gap-x-8 gap-y-3 tabular-nums">
            {(
              [
                ['Price (p)', `${money(single.price)}/patient`, COLOR_REVENUE],
                ['Variable cost (c)', `${moneyUnit(single.varCost)}/patient`, COLOR_COST],
                ['Fixed cost (F)', `${money(single.fixed)}/yr`, COLOR_COST],
              ] as const
            ).map(([label, value]) => (
              <span key={label}>
                <span className="block text-xs font-semibold text-stone-500 uppercase">
                  {label}
                </span>
                <span className="text-lg text-stone-700">{value}</span>
              </span>
            ))}
          </div>
          <BreakEvenChart
            lines={[
              {
                id: 'revenue',
                label: 'Total revenue',
                color: COLOR_REVENUE,
                at: (v) => revenueAt(single, v),
              },
              {
                id: 'cost',
                label: 'Total cost',
                color: COLOR_COST,
                at: (v) => costAt(single, v),
              },
            ]}
            xMax={xMaxSingle}
            step={stepSingle}
            unit="patients"
            yourLabel="YOUR VOLUME"
            q={qSingle}
            onQChange={setChosenSingle}
            crossingQ={qbe}
            crossingLabel={
              <>
                Q
                <tspan dy="3" fontSize="8">
                  BE
                </tspan>
                <tspan dy="-3">{` = ${fmtNum(qbe)}`}</tspan>
              </>
            }
            showCrossing={showAnswers}
            ariaLabel="Total revenue and total cost as the yearly patient volume varies"
          />
          <div className="mt-4 border-t border-stone-100 pt-3 text-sm">
            <span className="font-semibold text-stone-800">
              At {fmtNum(qSingle)} patients:
            </span>{' '}
            <span className="text-stone-600 tabular-nums">
              {profit === 0
                ? `revenue ${money(revenueAt(single, qSingle))} = cost ${money(costAt(single, qSingle))} — break even`
                : `revenue ${money(revenueAt(single, qSingle))} − cost ${money(costAt(single, qSingle))} = ${money(Math.abs(profit))} ${profit > 0 ? 'profit' : 'loss'}`}
            </span>
          </div>
        </div>
      )}

      {/* Two processes — make or buy */}
      {mode === 'compare' && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-end gap-x-8 gap-y-3 tabular-nums">
            {(
              [
                ['Make — fixed cost', money(compare.fixedMake), COLOR_MAKE],
                ['Make — per page', `${moneyUnit(compare.varMake)}/page`, COLOR_MAKE],
                ['Buy — fixed cost', money(compare.fixedBuy), COLOR_BUY],
                ['Buy — per page', `${moneyUnit(compare.varBuy)}/page`, COLOR_BUY],
              ] as const
            ).map(([label, value, color]) => (
              <span key={label}>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 uppercase">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </span>
                <span className="text-lg text-stone-700">{value}</span>
              </span>
            ))}
          </div>
          <BreakEvenChart
            lines={[
              {
                id: 'make',
                label: 'Cost of making',
                color: COLOR_MAKE,
                at: (v) => makeCostAt(compare, v),
              },
              {
                id: 'buy',
                label: 'Cost of buying',
                color: COLOR_BUY,
                at: (v) => buyCostAt(compare, v),
              },
            ]}
            xMax={xMaxCompare}
            step={stepCompare}
            unit="pages"
            yourLabel="YOUR VOLUME"
            q={qCompare}
            onQChange={setChosenCompare}
            crossingQ={qInd}
            crossingLabel={`Q = ${fmtNum(qInd)}`}
            showCrossing={showAnswers}
            ariaLabel="Cost of making and cost of buying as the page volume varies"
          />
          <div className="mt-4 border-t border-stone-100 pt-3 text-sm">
            <span className="font-semibold text-stone-800">
              At {fmtNum(qCompare)} pages:
            </span>{' '}
            <span className="text-stone-600 tabular-nums">
              {makeAtQ === buyAtQ
                ? `buy costs ${money2(buyAtQ)} and make costs ${money2(makeAtQ)} — they cost the same`
                : buyAtQ < makeAtQ
                  ? `buy costs ${money2(buyAtQ)}, make costs ${money2(makeAtQ)} — buy is cheaper by ${money2(makeAtQ - buyAtQ)}`
                  : `buy costs ${money2(buyAtQ)}, make costs ${money2(makeAtQ)} — make is cheaper by ${money2(buyAtQ - makeAtQ)}`}
            </span>
          </div>
        </div>
      )}

      {/* The calculations */}
      {showAnswers && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
          <h2 className="mb-4 text-lg font-semibold text-stone-900">
            The calculations
          </h2>

          {mode === 'single' ? (
            <div className="space-y-3 text-base text-stone-800 tabular-nums">
              <div className="space-y-2">
                <p>
                  <Dot color={COLOR_REVENUE} />
                  Total revenue = p × Q = {money(single.price)} × Q
                </p>
                <p>
                  <Dot color={COLOR_COST} />
                  Total cost = F + c × Q = {money(single.fixed)} +{' '}
                  {moneyUnit(single.varCost)} × Q
                </p>
              </div>
              <div className="space-y-2 border-t border-stone-100 pt-3">
                <p className="text-xs font-semibold text-stone-500 uppercase">
                  Break even where revenue = cost
                </p>
                <p>
                  {money(single.price)} × Q = {money(single.fixed)} +{' '}
                  {moneyUnit(single.varCost)} × Q
                </p>
                <p>
                  {moneyUnit(cm)} × Q = {money(single.fixed)}
                </p>
                <p className="text-lg font-semibold text-stone-900">
                  Q<sub>BE</sub> = {money(single.fixed)} / {moneyUnit(cm)} ={' '}
                  {fmtNum(qbe)} patients
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-base text-stone-800 tabular-nums">
              <div className="space-y-2">
                <p>
                  <Dot color={COLOR_MAKE} />
                  Cost to make = F + c × Q = {money(compare.fixedMake)} +{' '}
                  {moneyUnit(compare.varMake)} × Q
                </p>
                <p>
                  <Dot color={COLOR_BUY} />
                  Cost to buy = F + c × Q = {money(compare.fixedBuy)} +{' '}
                  {moneyUnit(compare.varBuy)} × Q
                </p>
              </div>
              <div className="space-y-2 border-t border-stone-100 pt-3">
                <p className="text-xs font-semibold text-stone-500 uppercase">
                  Costs are equal where make = buy
                </p>
                <p>
                  {money(compare.fixedMake)} + {moneyUnit(compare.varMake)} × Q ={' '}
                  {money(compare.fixedBuy)} + {moneyUnit(compare.varBuy)} × Q
                </p>
                <p>
                  {money(fDiff)} = {moneyUnit(vDiff)} × Q
                </p>
                <p className="text-lg font-semibold text-stone-900">
                  Q = {money(fDiff)} / {moneyUnit(vDiff)} = {fmtNum(qInd)} pages
                </p>
                <p className="font-semibold text-stone-900">
                  {Number.isInteger(qInd)
                    ? `Costs are equal at Q = ${fmtNum(qInd)} — buy below it, make above it`
                    : `Buy for Q ≤ ${fmtNum(Math.floor(qInd))} · Make for Q ≥ ${fmtNum(Math.floor(qInd) + 1)}`}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
