import { useEffect, useMemo, useState } from 'react'
import DemoHeader from '../../../components/DemoHeader'
import {
  PRODUCTS,
  TIME,
  WORKERS,
  ZERO_PLAN,
  type Plan,
  type ProductId,
} from '../../../lib/diablo'
import {
  CLASS_LP,
  evaluate,
  greedyPlan,
  randomLp,
  solveLp,
  type ConstraintCheck,
  type LpProblem,
} from '../../../lib/lp'

/** validated chart palette — same product colors as Chapter 6 */
const PRODUCT_COLOR: Record<ProductId, string> = {
  A: '#1d4ed8',
  B: '#a52547',
  C: '#0d9488',
  D: '#b45309',
}

const money = (v: number) => `$${v.toLocaleString('en-US')}`
const num = (v: number) => v.toLocaleString('en-US')

/** the Chapter 6 traditional plan, for the class-data comparison line */
const TRADITIONAL_PLAN: Plan = { A: 60, B: 80, C: 40, D: 100 }

/** a variable letter in its product color */
function Variable({ p }: { p: ProductId }) {
  return (
    <span className="font-semibold" style={{ color: PRODUCT_COLOR[p] }}>
      {p}
    </span>
  )
}

/** a linear expression with zero-coefficient terms omitted, e.g. 5C + 15D */
function Terms({ coeffs }: { coeffs: Record<ProductId, number> }) {
  const active = PRODUCTS.filter((p) => coeffs[p] !== 0)
  return (
    <>
      {active.map((p, i) => (
        <span key={p}>
          {i > 0 && <span className="text-stone-400"> + </span>}
          {coeffs[p] !== 1 && coeffs[p]}
          <Variable p={p} />
        </span>
      ))}
    </>
  )
}

/** the constraint's left side plugged with the plan, then ✓ or ✗ over by */
function PluggedCheck({ row, plan }: { row: ConstraintCheck; plan: Plan }) {
  const active = PRODUCTS.filter((p) => row.coeffs[p] !== 0)
  const isUnit = active.length === 1 && row.coeffs[active[0]] === 1
  const plugged = isUnit
    ? num(plan[active[0]])
    : active.map((p) => `${row.coeffs[p]}(${num(plan[p])})`).join(' + ') +
      ` = ${num(row.used)}`
  return row.satisfied ? (
    <span className="text-stone-600">
      {plugged} ≤ {num(row.rhs)}{' '}
      <span className="font-semibold text-teal-700">✓</span>
    </span>
  ) : (
    <span className="font-medium text-garnet-800">
      {plugged}{' '}
      <span className="font-semibold">✗ over by {num(row.used - row.rhs)}</span>
    </span>
  )
}

export default function SuppDLinearProgramming() {
  const [problem, setProblem] = useState<LpProblem>(CLASS_LP)
  const [isClass, setIsClass] = useState(true)
  const [plan, setPlan] = useState<Plan>({ ...ZERO_PLAN })
  const [showAnswers, setShowAnswers] = useState(true)
  const [bestFound, setBestFound] = useState<number | null>(null)

  useEffect(() => {
    document.title = 'Linear Programming · MGSC 395'
    return () => {
      document.title = 'MGSC 395 · Interactive Demos'
    }
  }, [])

  const ev = evaluate(problem, plan)
  const opt = useMemo(() => solveLp(problem), [problem])
  const greedy = useMemo(() => greedyPlan(problem), [problem])
  const rivalPlan = isClass ? TRADITIONAL_PLAN : greedy
  const rivalValue = evaluate(problem, rivalPlan).value

  useEffect(() => {
    if (ev.feasible && ev.value > (bestFound ?? 0)) setBestFound(ev.value)
  }, [ev.feasible, ev.value, bestFound])

  const setProduct = (p: ProductId, value: number) => {
    if (!Number.isFinite(value)) return
    setPlan((q) => ({
      ...q,
      [p]: Math.min(2 * problem.demands[p], Math.max(0, Math.round(value))),
    }))
  }

  const makeRandom = () => {
    setProblem(randomLp())
    setIsClass(false)
    setPlan({ ...ZERO_PLAN })
    setBestFound(null)
    setShowAnswers(false)
  }

  const backToClass = () => {
    setProblem(CLASS_LP)
    setIsClass(true)
    setPlan({ ...ZERO_PLAN })
    setBestFound(null)
    setShowAnswers(true)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DemoHeader label="Supplement D · Linear Programming" title="Diablo, Solved for Real">
        The same Diablo problem, written the way a computer solves it — one
        objective, nine inequalities, no guessing.
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

      {/* The problem — read-only givens */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-1 text-lg font-semibold text-stone-900">The problem</h2>
        <p className="mb-3 text-sm text-stone-600">
          Four products, five workers — and every worker has only 2,400
          minutes a week.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full max-w-lg min-w-96 text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                <th className="py-1.5 pr-3 font-semibold" />
                {PRODUCTS.map((p) => (
                  <th key={p} className="py-1.5 pr-3 text-right font-semibold">
                    <span className="flex items-center justify-end gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: PRODUCT_COLOR[p] }}
                      />
                      {p}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              <tr className="border-b border-stone-100">
                <td className="py-1 pr-3 text-stone-700">Margin, $/unit</td>
                {PRODUCTS.map((p) => (
                  <td key={p} className="py-1 pr-3 text-right text-stone-700">
                    ${problem.margins[p]}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-1 pr-3 text-stone-700">Demand, units/wk</td>
                {PRODUCTS.map((p) => (
                  <td key={p} className="py-1 pr-3 text-right text-stone-700">
                    {problem.demands[p]}
                  </td>
                ))}
              </tr>
              <tr>
                <td
                  colSpan={5}
                  className="pt-3 pb-1 text-xs font-semibold text-stone-400 uppercase"
                >
                  Minutes per unit
                </td>
              </tr>
              {WORKERS.map((w) => (
                <tr key={w} className="border-b border-stone-100 last:border-0">
                  <td className="py-1 pr-3 text-stone-700">{w}</td>
                  {PRODUCTS.map((p) => (
                    <td key={p} className="py-1 pr-3 text-right text-stone-700">
                      {TIME[w][p] > 0 ? TIME[w][p] : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* The linear program — with the plan plugged into every line */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold text-stone-900">
          The linear program
        </h2>
        <div className="overflow-x-auto">
          <div className="min-w-[38rem] font-mono text-sm tabular-nums">
            <div className="grid grid-cols-[16rem_6rem_1fr] items-baseline gap-x-4 py-1">
              <span className="text-stone-800">
                <span className="font-semibold text-stone-900">max </span>
                <Terms coeffs={problem.margins} />
              </span>
              <span className="font-sans text-xs text-stone-500">profit</span>
              <span className="text-stone-600">
                {PRODUCTS.map(
                  (p) => `${problem.margins[p]}(${num(plan[p])})`,
                ).join(' + ')}{' '}
                = <span className="font-semibold text-stone-900">{money(ev.value)}</span>
              </span>
            </div>
            <div className="py-1 font-sans text-xs font-semibold text-stone-500 uppercase">
              subject to
            </div>
            {ev.constraints.map((row) => (
              <div
                key={row.id}
                className={`grid grid-cols-[16rem_6rem_1fr] items-baseline gap-x-4 rounded px-1 py-1 -mx-1 ${
                  row.satisfied ? '' : 'bg-garnet-50/70'
                }`}
              >
                <span className="pl-4 text-stone-800">
                  <Terms coeffs={row.coeffs} />
                  <span className={row.satisfied ? 'text-stone-500' : 'font-medium text-garnet-800'}>
                    {' '}
                    ≤ {num(row.rhs)}
                  </span>
                </span>
                <span
                  className={`font-sans text-xs ${row.satisfied ? 'text-stone-500' : 'font-semibold text-garnet-800'}`}
                >
                  {row.label}
                </span>
                <PluggedCheck row={row} plan={plan} />
              </div>
            ))}
            <div className="grid grid-cols-[16rem_6rem_1fr] items-baseline gap-x-4 px-1 py-1 -mx-1">
              <span className="pl-4 text-stone-800">
                {PRODUCTS.map((p, i) => (
                  <span key={p}>
                    {i > 0 && <span className="text-stone-400">, </span>}
                    <Variable p={p} />
                  </span>
                ))}
                <span className="text-stone-500"> ≥ 0</span>
              </span>
              <span className="font-sans text-xs text-stone-500">non-negative</span>
              <span />
            </div>
          </div>
        </div>
      </div>

      {/* Your plan */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold text-stone-900">Your plan</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PRODUCTS.map((p) => (
            <div key={p} className="rounded-lg border border-stone-200 p-3">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-800">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: PRODUCT_COLOR[p] }}
                />
                Product {p}
              </div>
              <div className="mt-0.5 mb-2 text-xs text-stone-500 tabular-nums">
                ${problem.margins[p]} margin/unit · demand ≤ {problem.demands[p]}/wk
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setProduct(p, plan[p] - 10)}
                  disabled={plan[p] === 0}
                  aria-label={`Make 10 fewer of product ${p}`}
                  className="h-8 w-8 rounded-lg border border-stone-300 bg-white text-base font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  max={2 * problem.demands[p]}
                  step={10}
                  value={plan[p]}
                  onChange={(e) => setProduct(p, Number(e.target.value))}
                  aria-label={`Units of product ${p} per week`}
                  className="h-8 w-16 rounded-lg border border-stone-200 bg-white text-center text-sm tabular-nums focus:border-garnet-400 focus:outline-none"
                />
                <button
                  onClick={() => setProduct(p, plan[p] + 10)}
                  disabled={plan[p] >= 2 * problem.demands[p]}
                  aria-label={`Make 10 more of product ${p}`}
                  className="h-8 w-8 rounded-lg border border-stone-300 bg-white text-base font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
                >
                  +
                </button>
                <span className="ml-1 text-xs text-stone-500">units</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-stone-100 pt-3">
          <span
            className={`text-sm font-bold ${ev.feasible ? 'text-teal-700' : 'text-garnet-800'}`}
          >
            {ev.feasible
              ? `Feasible — profit ${money(ev.value)}`
              : `Infeasible — ${ev.violations} constraint${ev.violations === 1 ? '' : 's'} violated`}
          </span>
          {bestFound !== null && (
            <span className="text-sm text-stone-600 tabular-nums">
              Best feasible plan you&rsquo;ve found:{' '}
              <span className="font-semibold text-stone-900">{money(bestFound)}</span>
            </span>
          )}
        </div>
      </div>

      {/* The answer */}
      {showAnswers && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-lg font-semibold text-stone-900">The answer</h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <table className="text-sm tabular-nums">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                  {PRODUCTS.map((p) => (
                    <th key={p} className="py-1 pr-5 font-semibold last:pr-0">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: PRODUCT_COLOR[p] }}
                        />
                        {p}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {PRODUCTS.map((p) => (
                    <td key={p} className="py-1 pr-5 font-medium text-stone-800 last:pr-0">
                      {num(opt.plan[p])}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <span className="text-sm text-stone-700 tabular-nums">
              profit{' '}
              <span className="font-bold text-stone-900">{money(opt.value)}</span>
            </span>
            <button
              onClick={() => setPlan({ ...opt.plan })}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Load this plan
            </button>
          </div>
          <p className="mt-3 text-sm text-stone-600 tabular-nums">
            {isClass
              ? `The Chapter 6 traditional plan earns ${money(rivalValue)} — the LP finds ${money(opt.value - rivalValue)} more.`
              : `Filling demand in margin order (${PRODUCTS.map((p) => `${p} ${num(greedy[p])}`).join(', ')}) earns ${money(rivalValue)} — the LP finds ${money(opt.value - rivalValue)} more.`}
          </p>
        </div>
      )}
    </div>
  )
}
