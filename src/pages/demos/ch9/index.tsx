import { useEffect, useState } from 'react'
import DemoHeader from '../../../components/DemoHeader'
import {
  CLASS_SCENARIO,
  WORKING_DAYS,
  dailyDemand,
  daysBetween,
  holdingCost,
  orderingCost,
  ordersPerYear,
  qRange,
  qStar,
  randomScenario,
  reorderPoint,
  totalCost,
  type Scenario,
} from '../../../lib/eoq'
import { CostChart } from './CostChart'
import { Sawtooth } from './Sawtooth'

/** integers as-is, fractions to at most `dp` places — 2.5 stays "2.5" */
const fmtNum = (v: number, dp = 1) =>
  v.toLocaleString('en-US', { maximumFractionDigits: dp })

const money = (v: number) => {
  const r = Math.round(v * 100) / 100
  return Number.isInteger(r)
    ? `$${r.toLocaleString('en-US')}`
    : `$${r.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export default function Ch9Inventory() {
  const [scenario, setScenario] = useState<Scenario>({ ...CLASS_SCENARIO })
  const [q, setQ] = useState(() => Math.round(qStar(CLASS_SCENARIO)))
  const [showAnswers, setShowAnswers] = useState(true)

  useEffect(() => {
    document.title = 'Inventory Management · MGSC 395'
    return () => {
      document.title = 'MGSC 395 · Interactive Demos'
    }
  }, [])

  const range = qRange(scenario)
  const d = dailyDemand(scenario)
  const qs = qStar(scenario)
  const rop = reorderPoint(scenario)

  const applyScenario = (next: Scenario) => {
    setScenario(next)
    const r = qRange(next)
    setQ(Math.min(r.max, Math.max(r.min, Math.round(qStar(next)))))
  }

  const setChosenQ = (value: number) => {
    if (!Number.isFinite(value)) return
    setQ(Math.min(range.max, Math.max(range.min, Math.round(value))))
  }

  // ── practice toolbar ────────────────────────────────────
  const isClass =
    scenario.D === CLASS_SCENARIO.D &&
    scenario.S === CLASS_SCENARIO.S &&
    scenario.H === CLASS_SCENARIO.H &&
    scenario.leadTime === CLASS_SCENARIO.leadTime

  const backToClass = () => {
    applyScenario({ ...CLASS_SCENARIO })
  }
  const makeRandom = () => {
    applyScenario(randomScenario())
    setShowAnswers(false)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DemoHeader label="Chapter 9 · Inventory Management" title="The Economic Order Quantity">
        Pick an order quantity and watch the cost trade-off and the
        inventory sawtooth respond as you drag.
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

      {/* The problem — read-only parameters */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold text-stone-900">The problem</h2>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3 tabular-nums">
          {(
            [
              ['Annual demand (D)', `${fmtNum(scenario.D)} units/yr`],
              ['Order cost (S)', `${money(scenario.S)}/order`],
              ['Holding cost (H)', `$${scenario.H.toFixed(2)}/unit·yr`],
              [
                'Lead time',
                `${scenario.leadTime} day${scenario.leadTime === 1 ? '' : 's'}`,
              ],
              ['Working days', `${WORKING_DAYS} working days/yr`],
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
      </div>

      {/* Annual costs vs Q — drag the dashed line to choose Q */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-2 text-lg font-semibold text-stone-900">
          The annual costs
        </h2>
        <CostChart
          scenario={scenario}
          q={q}
          qMin={range.min}
          qMax={range.max}
          showQStar={showAnswers}
          onQChange={setChosenQ}
        />
      </div>

      {/* Inventory over time */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-2 text-lg font-semibold text-stone-900">
          The inventory cycle
        </h2>
        <Sawtooth scenario={scenario} q={q} showRopValue={showAnswers} />
      </div>

      {/* The calculations */}
      {showAnswers && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-lg font-semibold text-stone-900">
            The calculations
          </h2>
          <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
            <div className="space-y-1.5 text-sm text-stone-700 tabular-nums">
              <p>
                Q* = √(2 × {fmtNum(scenario.D)} × {fmtNum(scenario.S, 2)} /{' '}
                {scenario.H.toFixed(2)}) = {fmtNum(qs)} units
              </p>
              <p>
                d = {fmtNum(scenario.D)} / {WORKING_DAYS} = {fmtNum(d)} units/day
              </p>
              <p>
                Orders per year = {fmtNum(scenario.D)} / {fmtNum(qs)} ={' '}
                {fmtNum(ordersPerYear(scenario, qs), 2)}
              </p>
              <p>
                Days between orders = {fmtNum(qs)} / {fmtNum(d)} ={' '}
                {fmtNum(daysBetween(scenario, qs))} days
              </p>
              <p>
                ROP = {fmtNum(d)} × {scenario.leadTime} = {fmtNum(rop)} units
              </p>
              <p>
                Annual ordering cost = {fmtNum(ordersPerYear(scenario, qs), 2)} ×{' '}
                {money(scenario.S)} = {money(orderingCost(scenario, qs))}
              </p>
              <p>
                Annual holding cost = ({fmtNum(qs)} / 2) × $
                {scenario.H.toFixed(2)} = {money(holdingCost(scenario, qs))}
              </p>
              <p className="font-semibold text-stone-900">
                Total annual cost = {money(totalCost(scenario, qs))}
              </p>
            </div>
            <div className="space-y-1.5 text-sm text-stone-700 tabular-nums">
              <p className="text-xs font-semibold text-stone-500 uppercase">
                At your Q = {q.toLocaleString('en-US')}
                {q === Math.round(qs) ? ' (= Q*)' : ''}
              </p>
              <p>
                Annual ordering cost = ({fmtNum(scenario.D)} /{' '}
                {q.toLocaleString('en-US')}) × {money(scenario.S)} ={' '}
                {money(orderingCost(scenario, q))}
              </p>
              <p>
                Annual holding cost = ({q.toLocaleString('en-US')} / 2) × $
                {scenario.H.toFixed(2)} = {money(holdingCost(scenario, q))}
              </p>
              <p className="font-semibold text-stone-900">
                Total annual cost = {money(totalCost(scenario, q))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
