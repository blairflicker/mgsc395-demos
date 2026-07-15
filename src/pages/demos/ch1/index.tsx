import { useEffect, useState } from 'react'
import DemoHeader from '../../../components/DemoHeader'
import {
  CLASS_MULTI,
  CLASS_SINGLE,
  laborHours,
  mfp,
  randomMulti,
  randomSingle,
  revenue,
  totalInput,
  unitCost,
  unitsPerLaborHour,
  valueMfp,
  valuePerLaborHour,
  type MultiFactorCase,
  type SingleFactorCase,
} from '../../../lib/productivity'

/** validated chart palette — one color per input dollar; revenue stays stone */
const INPUT_COLORS = {
  labor: '#1d4ed8',
  materials: '#0d9488',
  overhead: '#b45309',
} as const
const REVENUE_COLOR = '#44403c'

const int = (v: number) => v.toLocaleString('en-US')
const money = (v: number) =>
  Number.isInteger(v)
    ? `$${v.toLocaleString('en-US')}`
    : `$${v.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
const money2 = (v: number) =>
  `$${v.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
const rate = (v: number) =>
  v.toLocaleString('en-US', { maximumFractionDigits: 2 })
const ratio = (v: number) =>
  v.toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })

export default function Ch1Productivity() {
  const [single, setSingle] = useState<SingleFactorCase>(CLASS_SINGLE)
  const [multi, setMulti] = useState<MultiFactorCase>(CLASS_MULTI)
  const [isClass, setIsClass] = useState(true)
  const [showAnswers, setShowAnswers] = useState(true)

  useEffect(() => {
    document.title = 'Productivity · MGSC 395'
    return () => {
      document.title = 'MGSC 395 · Interactive Demos'
    }
  }, [])

  const backToClass = () => {
    setSingle(CLASS_SINGLE)
    setMulti(CLASS_MULTI)
    setIsClass(true)
    setShowAnswers(true)
  }

  const makeRandom = () => {
    setSingle(randomSingle())
    setMulti(randomMulti())
    setIsClass(false)
    setShowAnswers(false)
  }

  const lh = laborHours(single)
  const uplh = unitsPerLaborHour(single)
  const vplh = valuePerLaborHour(single)

  const total = totalInput(multi)
  const m = mfp(multi)
  const uc = unitCost(multi)
  const rev = revenue(multi)
  const vm = valueMfp(multi)
  /** both bars share this scale, so a dollar is the same width everywhere */
  const scaleMax = Math.max(total, rev)

  const inputSegments = [
    { key: 'labor', name: 'labor', dollars: multi.labor },
    { key: 'materials', name: 'materials', dollars: multi.materials },
    { key: 'overhead', name: 'overhead', dollars: multi.overhead },
  ] as const

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DemoHeader label="Chapter 1 · Productivity" title="Output over Input">
        One crew, one factory, one fraction — every productivity measure is
        output divided by the input it took.
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

      {/* One input — read-only givens */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold text-stone-900">
          One input — the carpet crew
        </h2>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3 tabular-nums">
          {(
            [
              ['', 'Workers', int(single.workers)],
              ['Hours per', 'worker', `${single.hours} h`],
              ['Output', 'installed', `${int(single.output)} sq yd`],
              ['Value', 'per unit', `${money(single.unitValue)}/sq yd`],
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
      </div>

      {/* Many inputs — read-only givens and the leverage picture */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold text-stone-900">
          Many inputs — the factory
        </h2>
        <div className="mb-4 flex flex-wrap items-end gap-x-8 gap-y-3 tabular-nums">
          {(
            [
              ['Monthly', 'output', `${int(multi.output)} units`],
              ['Labor', 'cost', money(multi.labor)],
              ['Materials', 'cost', money(multi.materials)],
              ['', 'Overhead', money(multi.overhead)],
              ['Selling', 'price', `${money(multi.price)}/unit`],
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
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
          {inputSegments.map((seg) => (
            <span key={seg.key} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: INPUT_COLORS[seg.key] }}
              />
              {seg.name}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: REVENUE_COLOR }}
            />
            revenue
          </span>
        </div>
        <div className="space-y-2.5">
          <div className="grid grid-cols-[5.5rem_1fr_9rem] items-center gap-3">
            <span className="text-sm font-medium text-stone-800">Inputs</span>
            <div>
              <div
                className="flex h-5 overflow-hidden rounded"
                style={{ width: `${(total / scaleMax) * 100}%` }}
              >
                {inputSegments.map((seg) => (
                  <div
                    key={seg.key}
                    title={`${seg.name} — ${money(seg.dollars)}`}
                    style={{
                      width: `${(seg.dollars / total) * 100}%`,
                      backgroundColor: INPUT_COLORS[seg.key],
                    }}
                  />
                ))}
              </div>
            </div>
            <span className="text-right text-xs font-semibold text-stone-700 tabular-nums">
              {money(total)} in
            </span>
          </div>
          <div className="grid grid-cols-[5.5rem_1fr_9rem] items-center gap-3">
            <span className="text-sm font-medium text-stone-800">Revenue</span>
            <div>
              <div
                className="h-5 overflow-hidden rounded"
                title={`revenue — ${money(rev)}`}
                style={{
                  width: `${(rev / scaleMax) * 100}%`,
                  backgroundColor: REVENUE_COLOR,
                }}
              />
            </div>
            <span className="text-right text-xs font-semibold text-stone-700 tabular-nums">
              {money(rev)} out
            </span>
          </div>
        </div>
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
                Labor-hours = {single.workers} × {single.hours} = {int(lh)}{' '}
                labor-hours
              </p>
              <p>
                Productivity = {int(single.output)} / {int(lh)} = {rate(uplh)}{' '}
                {single.outputLabel} per labor-hour
              </p>
              <p>
                Value productivity = ({int(single.output)} ×{' '}
                {money(single.unitValue)}) / {int(lh)} = {money(vplh)} per
                labor-hour
              </p>
            </div>
            <div className="space-y-1.5">
              <p>
                Total input = {int(multi.labor)} + {int(multi.materials)} +{' '}
                {int(multi.overhead)} = {money(total)}
              </p>
              <p>
                Multifactor productivity = {int(multi.output)} / {int(total)} ={' '}
                {ratio(m)} units per input $
              </p>
              <p>
                Unit cost = {int(total)} / {int(multi.output)} = {money(uc)} per
                unit
              </p>
              <p>
                Revenue = {int(multi.output)} × {money(multi.price)} ={' '}
                {money(rev)}
              </p>
              <p>
                Value-based productivity = {int(rev)} / {int(total)} ={' '}
                {ratio(vm)} — every input dollar becomes {money2(vm)} of output
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
