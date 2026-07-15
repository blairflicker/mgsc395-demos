import { useEffect, useState } from 'react'
import DemoHeader from '../../../components/DemoHeader'
import {
  CLASS_SCENARIO,
  paretoRows,
  randomCategories,
  totalCount,
  type ParetoScenario,
} from '../../../lib/pareto'
import { ParetoChart, type ChartMode } from './ParetoChart'

const fmtPct = (fraction: number) => `${(fraction * 100).toFixed(1)}%`

/** lowercase a category name for mid-sentence use, sparing acronyms */
const inSentence = (name: string) =>
  /[A-Z]/.test(name[1] ?? '') ? name : name[0].toLowerCase() + name.slice(1)

/** "a", "a and b", or "a, b, and c" */
const joinNames = (names: string[]) =>
  names.length <= 2
    ? names.join(' and ')
    : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`

export default function Ch2ProcessAnalysis() {
  const [scenario, setScenario] = useState<ParetoScenario>(CLASS_SCENARIO)
  const [isClass, setIsClass] = useState(true)
  const [showAnswers, setShowAnswers] = useState(true)
  const [mode, setMode] = useState<ChartMode>('collected')
  const [fixedIds, setFixedIds] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    document.title = 'Process Analysis · MGSC 395'
    return () => {
      document.title = 'MGSC 395 · Interactive Demos'
    }
  }, [])

  const { unit, categories } = scenario
  const total = totalCount(categories)
  const rows = paretoRows(categories)
  const topTwo = rows.slice(0, 2)
  const topTwoCount = topTwo.reduce((s, r) => s + r.category.count, 0)

  const fixedRows = rows.filter((r) => fixedIds.has(r.category.id))
  const fixedCount = fixedRows.reduce((s, r) => s + r.category.count, 0)

  const backToClass = () => {
    setScenario(CLASS_SCENARIO)
    setIsClass(true)
    setShowAnswers(true)
    setMode('collected')
    setFixedIds(new Set())
  }

  const makeRandom = () => {
    setScenario(randomCategories())
    setIsClass(false)
    setShowAnswers(false)
    setMode('collected')
    setFixedIds(new Set())
  }

  const toggleFixed = (id: string) => {
    setFixedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DemoHeader label="Chapter 2 · Process Analysis" title="The Vital Few">
        Sort the tally tallest-first and the chart tells you which one or two
        problems carry most of the {unit}.
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

      {/* The survey — read-only givens, in collected order */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold text-stone-900">The survey</h2>
        <table className="text-sm tabular-nums">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
              <th className="py-1.5 pr-10 font-semibold">Category</th>
              <th className="py-1.5 text-right font-semibold">{unit}</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-stone-100">
                <td className="py-1 pr-10 text-stone-700">{c.name}</td>
                <td className="py-1 text-right text-stone-700">{c.count}</td>
              </tr>
            ))}
            <tr className="font-semibold text-stone-900">
              <td className="py-1 pr-10">Total</td>
              <td className="py-1 text-right">{total}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* The chart */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-stone-900">The chart</h2>
          <div className="flex overflow-hidden rounded-lg border border-stone-300 text-sm">
            {(
              [
                ['collected', 'As collected'],
                ['sorted', 'Sorted (Pareto)'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                className={
                  mode === value
                    ? 'bg-garnet-800 px-3 py-1.5 font-medium text-white'
                    : 'bg-white px-3 py-1.5 text-stone-700 hover:bg-stone-50'
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ParetoChart
          categories={categories}
          mode={mode}
          fixedIds={fixedIds}
          onToggle={toggleFixed}
          unit={unit}
        />
        <p className="mt-2 text-sm text-stone-600 tabular-nums">
          {fixedRows.length === 0 ? (
            'Click the problems you would fix.'
          ) : (
            <>
              Fix{' '}
              {joinNames(fixedRows.map((r) => inSentence(r.category.name)))} →{' '}
              <span className="font-semibold text-stone-900">
                {fixedCount} of {total} {unit} ({fmtPct(fixedCount / total)})
              </span>{' '}
              addressed.
            </>
          )}
        </p>
      </div>

      {/* The calculations */}
      {showAnswers && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-lg font-semibold text-stone-900">
            The calculations
          </h2>
          <div className="space-y-4 text-sm text-stone-700 tabular-nums">
            <div className="overflow-x-auto">
              <table className="min-w-96 text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                    <th className="py-1.5 pr-8 font-semibold">Category</th>
                    <th className="py-1.5 pr-8 text-right font-semibold">
                      Count
                    </th>
                    <th className="py-1.5 pr-8 text-right font-semibold">
                      Percent
                    </th>
                    <th className="py-1.5 text-right font-semibold">
                      Cumulative
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.category.id}
                      className="border-b border-stone-100 last:border-0"
                    >
                      <td className="py-1 pr-8 text-stone-700">
                        {r.category.name}
                      </td>
                      <td className="py-1 pr-8 text-right text-stone-700">
                        {r.category.count}
                      </td>
                      <td className="py-1 pr-8 text-right text-stone-700">
                        {r.category.count} / {total} = {fmtPct(r.percent)}
                      </td>
                      <td className="py-1 text-right text-stone-700">
                        {fmtPct(r.cumulativePercent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="font-semibold text-stone-900">
              Fixing the top two addresses{' '}
              {topTwo.map((r) => r.category.count).join(' + ')} = {topTwoCount}{' '}
              of {total} = {fmtPct(topTwoCount / total)}.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
