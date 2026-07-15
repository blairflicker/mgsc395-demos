import { useEffect, useState } from 'react'
import DemoHeader from '../../../components/DemoHeader'
import {
  CLASS_CASE,
  dependableHours,
  hoursPerMachine,
  lotCount,
  machinesRequired,
  processingHours,
  productHours,
  randomCase,
  reservedHours,
  setupHours,
  totalHours,
  utilizationAt,
  type CapacityCase,
} from '../../../lib/capacity'

/** validated chart palette — one color per product, garnet kept for the cushion */
const PRODUCT_COLORS = ['#1d4ed8', '#0d9488', '#b45309']

/** diagonal stripes mark setup time, in the product's own color */
const setupStyle = (color: string): React.CSSProperties => ({
  background: `repeating-linear-gradient(135deg, ${color} 0px, ${color} 3px, ${color}55 3px, ${color}55 6px)`,
})

const fmtH = (v: number) =>
  v.toLocaleString('en-US', { maximumFractionDigits: 1 })
const fmt1 = (v: number) => v.toFixed(1)

const MAX_MACHINES = 15

export default function Ch5CapacityPlanning() {
  const [cap, setCap] = useState<CapacityCase>(CLASS_CASE)
  const [isClass, setIsClass] = useState(true)
  const [machines, setMachines] = useState(() =>
    Math.ceil(machinesRequired(CLASS_CASE)),
  )
  const [showAnswers, setShowAnswers] = useState(true)

  useEffect(() => {
    document.title = 'Capacity Planning · MGSC 395'
    return () => {
      document.title = 'MGSC 395 · Interactive Demos'
    }
  }, [])

  const N = hoursPerMachine(cap)
  const reserved = reservedHours(cap)
  const dependable = dependableHours(cap)
  const total = totalHours(cap)
  const mReq = machinesRequired(cap)
  const need = Math.ceil(mReq)
  const util = utilizationAt(cap, machines)
  const eff = 100 - util
  const anySetups = cap.products.some((pl) => pl.s !== null)
  /** both cards share this scale, so an hour is the same width everywhere */
  const scaleMax = Math.max(total, N)

  const setMachineCount = (value: number) => {
    if (!Number.isFinite(value)) return
    setMachines(Math.min(MAX_MACHINES, Math.max(1, Math.round(value))))
  }

  const backToClass = () => {
    setCap(CLASS_CASE)
    setIsClass(true)
    setMachines(Math.ceil(machinesRequired(CLASS_CASE)))
    setShowAnswers(true)
  }

  const makeRandom = () => {
    const c = randomCase()
    setCap(c)
    setIsClass(false)
    setMachines(1)
    setShowAnswers(false)
  }

  // work segments, in product order: processing then setup
  const segments = cap.products.flatMap((pl, i) => {
    const color = PRODUCT_COLORS[i % PRODUCT_COLORS.length]
    const out: { key: string; hours: number; style: React.CSSProperties; title: string }[] = [
      {
        key: `${pl.id}p`,
        hours: processingHours(pl),
        style: { backgroundColor: color },
        title: `${pl.name} — processing: ${fmtH(processingHours(pl))} h`,
      },
    ]
    if (pl.s !== null) {
      out.push({
        key: `${pl.id}s`,
        hours: setupHours(pl),
        style: setupStyle(color),
        title: `${pl.name} — setup: ${fmtH(setupHours(pl))} h`,
      })
    }
    return out
  })

  const verdict =
    util > 100
      ? {
          label: 'Won’t fit',
          cls: 'text-garnet-800',
          detail: `Even at 100% utilization, ${machines} machine${machines === 1 ? '' : 's'} suppl${machines === 1 ? 'ies' : 'y'} only ${fmtH(machines * N)} of the ${fmtH(total)} hours needed — ${fmtH(total - machines * N)} hours of work don’t fit.`,
        }
      : machines < need
        ? {
            label: 'Fits, but eats the cushion',
            cls: 'text-amber-700',
            detail: `Utilization runs ${fmt1(util)}%, leaving an effective cushion of ${fmt1(eff)}% — under the ${cap.cushion}% set aside.`,
          }
        : {
            label: 'Enough machines',
            cls: 'text-teal-700',
            detail: `Utilization is ${fmt1(util)}%, so the effective cushion is ${fmt1(eff)}% — the ${cap.cushion}% target holds.${machines > need ? ` ${need} machines would already do it.` : ''}`,
          }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DemoHeader label="Chapter 5 · Capacity Planning" title="How Many Machines?">
        One workstation, one big decision — see where the hours come from,
        where they go, and what your purchase does to the cushion.
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
        <h2 className="mb-3 text-lg font-semibold text-stone-900">The problem</h2>
        <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
          <table className="text-sm tabular-nums">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                <th className="py-1.5 pr-5 font-semibold">Product</th>
                <th className="py-1.5 pr-5 text-right font-semibold">
                  Demand (D)
                </th>
                <th className="py-1.5 pr-5 text-right font-semibold">
                  Hours/unit (p)
                </th>
                <th className="py-1.5 pr-5 text-right font-semibold">
                  Lot size (Q)
                </th>
                <th className="py-1.5 text-right font-semibold">
                  Setup hours (s)
                </th>
              </tr>
            </thead>
            <tbody>
              {cap.products.map((pl, i) => (
                <tr key={pl.id} className="border-b border-stone-100 last:border-0">
                  <td className="py-1 pr-5 text-stone-700">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: PRODUCT_COLORS[i % PRODUCT_COLORS.length],
                        }}
                      />
                      {pl.name}
                    </span>
                  </td>
                  <td className="py-1 pr-5 text-right text-stone-700">
                    {pl.D.toLocaleString('en-US')}
                  </td>
                  <td className="py-1 pr-5 text-right text-stone-700">
                    {pl.p.toFixed(2)}
                  </td>
                  <td className="py-1 pr-5 text-right text-stone-700">
                    {pl.Q !== null ? pl.Q : '—'}
                  </td>
                  <td className="py-1 text-right text-stone-700">
                    {pl.s !== null ? pl.s.toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3 tabular-nums">
            {(
              [
                ['Operating days', `${cap.days}/yr`],
                ['Shifts', `${cap.shifts} × ${cap.shiftHours} h/day`],
                ['Hours per machine (N)', `${fmtH(N)} h/yr`],
                ['Target cushion (C)', `${cap.cushion}%`],
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
      </div>

      {/* The work — where machine time is needed */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-stone-900">
            The work to be done
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
            {cap.products.map((pl, i) => (
              <span key={pl.id} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: PRODUCT_COLORS[i % PRODUCT_COLORS.length],
                  }}
                />
                {pl.name}
              </span>
            ))}
            {anySetups && (
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-4 rounded-sm"
                  style={setupStyle('#78716c')}
                />
                setup time
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-[5.5rem_1fr_13rem] items-center gap-3">
          <span className="text-sm font-semibold text-stone-900">Total</span>
          <div>
            <div
              className="flex h-5 overflow-hidden rounded"
              style={{ width: `${(total / scaleMax) * 100}%` }}
            >
              {segments.map((seg) => (
                <div
                  key={seg.key}
                  title={seg.title}
                  style={{ width: `${(seg.hours / total) * 100}%`, ...seg.style }}
                />
              ))}
            </div>
          </div>
          <span className="text-right text-xs font-semibold text-stone-700 tabular-nums">
            {fmtH(total)} h needed
          </span>
        </div>
      </div>

      {/* The machines — where machine time comes from */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-stone-900">
            How many machines should we buy?
          </h2>
          <span className="flex items-center gap-1.5">
            <button
              onClick={() => setMachineCount(machines - 1)}
              disabled={machines <= 1}
              aria-label="Buy one fewer machine"
              className="h-8 w-8 rounded-lg border border-stone-300 bg-white text-base font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={MAX_MACHINES}
              value={machines}
              onChange={(e) => setMachineCount(Number(e.target.value))}
              aria-label="Number of machines to buy"
              className="h-8 w-16 rounded-lg border border-stone-200 bg-white text-center text-sm tabular-nums focus:border-garnet-400 focus:outline-none"
            />
            <button
              onClick={() => setMachineCount(machines + 1)}
              disabled={machines >= MAX_MACHINES}
              aria-label="Buy one more machine"
              className="h-8 w-8 rounded-lg border border-stone-300 bg-white text-base font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
            >
              +
            </button>
            <span className="ml-1 text-sm text-stone-600">machines</span>
          </span>
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
          {cap.products.map((pl, i) => (
            <span key={pl.id} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  backgroundColor: PRODUCT_COLORS[i % PRODUCT_COLORS.length],
                }}
              />
              {pl.name}
            </span>
          ))}
          {anySetups && (
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-4 rounded-sm"
                style={setupStyle('#78716c')}
              />
              setup time
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded-sm border border-dashed border-garnet-300 bg-garnet-100/70" />
            cushion set aside ({cap.cushion}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded-sm border border-stone-200 bg-stone-100" />
            hours you can count on
          </span>
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: machines }, (_, m) => (
            <div
              key={m}
              className="grid grid-cols-[5.5rem_1fr_13rem] items-center gap-3"
            >
              <span className="text-sm font-medium text-stone-800">
                Machine {m + 1}
              </span>
              <div>
                <div
                  className="relative h-5 overflow-hidden rounded bg-stone-100"
                  style={{ width: `${(N / scaleMax) * 100}%` }}
                >
                  <div
                    className="absolute inset-y-0 right-0 bg-garnet-100/70"
                    style={{ width: `${cap.cushion}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 flex"
                    style={{ width: `${Math.min(100, util)}%` }}
                  >
                    {segments.map((seg) => (
                      <div
                        key={seg.key}
                        title={`${seg.title} total — ${fmtH(seg.hours / machines)} h on this machine`}
                        style={{ width: `${(seg.hours / total) * 100}%`, ...seg.style }}
                      />
                    ))}
                  </div>
                  <div
                    className="absolute inset-y-0 w-0 border-l-2 border-dashed border-garnet-400"
                    style={{ left: `${100 - cap.cushion}%` }}
                  />
                </div>
              </div>
              <span className="text-right text-xs text-stone-500 tabular-nums">
                {fmtH(total / machines)} / {fmtH(N)} h
              </span>
            </div>
          ))}
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
            <div className="overflow-x-auto">
              <table className="min-w-96 text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                    <th className="py-1.5 pr-6 font-semibold">Item</th>
                    {cap.products.map((pl) => (
                      <th key={pl.id} className="py-1.5 pr-6 text-right font-semibold">
                        {pl.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-stone-100">
                    <td className="py-1 pr-6 text-stone-700">Processing time</td>
                    {cap.products.map((pl) => (
                      <td key={pl.id} className="py-1 pr-6 text-right text-stone-700">
                        {pl.D.toLocaleString('en-US')} × {pl.p.toFixed(2)} ={' '}
                        {fmtH(processingHours(pl))} h
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-stone-100">
                    <td className="py-1 pr-6 text-stone-700">Number of lots</td>
                    {cap.products.map((pl) => (
                      <td key={pl.id} className="py-1 pr-6 text-right text-stone-700">
                        {pl.Q !== null
                          ? `${pl.D.toLocaleString('en-US')} / ${pl.Q} = ${fmtH(lotCount(pl))}`
                          : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-stone-100">
                    <td className="py-1 pr-6 text-stone-700">Setup time</td>
                    {cap.products.map((pl) => (
                      <td key={pl.id} className="py-1 pr-6 text-right text-stone-700">
                        {pl.s !== null
                          ? `${fmtH(lotCount(pl))} × ${pl.s.toFixed(2)} = ${fmtH(setupHours(pl))} h`
                          : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr className="font-semibold text-stone-900">
                    <td className="py-1 pr-6">Total time</td>
                    {cap.products.map((pl) => (
                      <td key={pl.id} className="py-1 pr-6 text-right">
                        {fmtH(productHours(pl))} h
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="space-y-1.5">
              <p>
                N = {cap.days} days ×{' '}
                {cap.shifts > 1 ? `${cap.shifts} shifts × ` : ''}
                {cap.shiftHours} h = {fmtH(N)} h per machine
              </p>
              <p>
                Reserved cushion = {fmtH(N)} × {cap.cushion}% = {fmtH(reserved)} h
              </p>
              <p>
                Hours you can count on = {fmtH(N)} − {fmtH(reserved)} ={' '}
                {fmtH(dependable)} h
              </p>
            </div>
            <div className="space-y-1.5">
              <p>
                M = ({cap.products.map((pl) => fmtH(productHours(pl))).join(' + ')})
                / {fmtH(dependable)} = {mReq.toFixed(2)} machines
              </p>
              <p className="font-semibold text-stone-900">
                Round up → buy {need} machines
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
