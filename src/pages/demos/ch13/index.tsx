import { useEffect, useMemo, useState } from 'react'
import DemoHeader from '../../../components/DemoHeader'
import {
  CLASS_CUSTOMERS,
  GRID_MAX_X,
  GRID_MAX_Y,
  centerOfGravity,
  distance,
  loadDistance,
  nextCustomerId,
  randomCustomers,
  round1,
  totalLoad,
  type CustomerInput,
  type DistanceMetric,
  type Point,
} from '../../../lib/cog'
import { LocationMap } from './Map'
import { downloadWorksheet } from './worksheet'

const MAX_CUSTOMERS = 12

const DEFAULT_PIN: Point = { x: 10, y: 8 }

const cloneCustomers = (): CustomerInput[] => CLASS_CUSTOMERS.map((c) => ({ ...c }))

const CELL_INPUT =
  'w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm ' +
  'hover:border-stone-200 focus:border-garnet-400 focus:bg-white focus:outline-none'

const fmtInt = (v: number) => Math.round(v).toLocaleString('en-US')
const fmt1 = (v: number) => v.toFixed(1)

/** the blank write-in box used wherever an answer is hidden */
function Blank({ w = 'w-14' }: { w?: string }) {
  return <div className={`ml-auto h-5 ${w} rounded border border-stone-200 bg-stone-50/50`} />
}

export default function Ch13FacilityLocation() {
  const [customers, setCustomers] = useState<CustomerInput[]>(cloneCustomers)
  const [pin, setPin] = useState<Point>(DEFAULT_PIN)
  const [metric, setMetric] = useState<DistanceMetric>('rectilinear')
  const [showDistances, setShowDistances] = useState(true)
  const [showAnswers, setShowAnswers] = useState(true)

  useEffect(() => {
    document.title = 'Facility Location Â· MGSC 395'
    return () => {
      document.title = 'MGSC 395 Â· Interactive Demos'
    }
  }, [])

  const total = useMemo(() => totalLoad(customers), [customers])
  const cg = useMemo(() => centerOfGravity(customers), [customers])
  /** the class convention: round the CG to one decimal before scoring */
  const cgRounded = useMemo(
    () => (cg ? { x: round1(cg.x), y: round1(cg.y) } : null),
    [cg],
  )
  const ldAtCg = useMemo(
    () => (cgRounded ? loadDistance(customers, cgRounded, metric) : null),
    [customers, cgRounded, metric],
  )
  const ldAtPin = useMemo(
    () => loadDistance(customers, pin, metric),
    [customers, pin, metric],
  )

  // â”€â”€ customer editing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const patchCustomer = (id: string, patch: Partial<CustomerInput>) => {
    setCustomers((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }
  const setCoord = (id: string, axis: 'x' | 'y', value: number) => {
    if (!Number.isFinite(value)) return
    const max = axis === 'x' ? GRID_MAX_X : GRID_MAX_Y
    patchCustomer(id, { [axis]: Math.min(max, Math.max(0, value)) })
  }
  const setLoad = (id: string, value: number) => {
    if (!Number.isFinite(value)) return
    patchCustomer(id, { load: Math.max(0, Math.round(value)) })
  }
  const deleteCustomer = (id: string) => {
    setCustomers((list) => list.filter((c) => c.id !== id))
  }
  const addCustomer = () => {
    setCustomers((list) => [
      ...list,
      { id: nextCustomerId(list), name: '', x: 10, y: 8, load: 10_000 },
    ])
  }

  // â”€â”€ practice toolbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const isClassData =
    customers.length === CLASS_CUSTOMERS.length &&
    CLASS_CUSTOMERS.every((c, i) => {
      const r = customers[i]
      return r.name === c.name && r.x === c.x && r.y === c.y && r.load === c.load
    })

  const backToClass = () => {
    setCustomers(cloneCustomers())
  }
  const makeRandom = () => {
    setCustomers(randomCustomers())
    setShowAnswers(false)
  }

  const ldDelta =
    ldAtCg !== null ? Math.round(ldAtPin) - Math.round(ldAtCg) : null

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DemoHeader
        label="Chapter 13 Â· Supply Chain Logistic Networks"
        title="The Center of Gravity, Live"
      >
        The power-generator example from class â€” drag the pin to test a
        site, edit the customers, and watch the center of gravity and
        load-distance scores update live. Or hide the answers and practice
        on a random problem.
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
          disabled={isClassData}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
        >
          Back to class data
        </button>
      </div>

      {/* The map â€” the hero */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-stone-900">The map</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex overflow-hidden rounded-lg border border-stone-300 text-sm"
              role="group"
              aria-label="Distance metric"
            >
              <button
                onClick={() => setMetric('rectilinear')}
                aria-pressed={metric === 'rectilinear'}
                className={
                  metric === 'rectilinear'
                    ? 'bg-garnet-800 px-3 py-1.5 font-medium text-white'
                    : 'bg-white px-3 py-1.5 text-stone-700 hover:bg-stone-50'
                }
              >
                Rectilinear (city blocks)
              </button>
              <button
                onClick={() => setMetric('euclidean')}
                aria-pressed={metric === 'euclidean'}
                className={
                  metric === 'euclidean'
                    ? 'bg-garnet-800 px-3 py-1.5 font-medium text-white'
                    : 'bg-white px-3 py-1.5 text-stone-700 hover:bg-stone-50'
                }
              >
                Euclidean (straight line)
              </button>
            </div>
            <button
              onClick={() => setShowDistances((v) => !v)}
              aria-pressed={showDistances}
              className={
                showDistances
                  ? 'rounded-lg bg-garnet-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-garnet-700'
                  : 'rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50'
              }
            >
              {showDistances ? 'Hide distances' : 'Show distances'}
            </button>
          </div>
        </div>
        <LocationMap
          customers={customers}
          cg={showAnswers ? cgRounded : null}
          pin={pin}
          showAnswers={showAnswers}
          showDistances={showDistances}
          metric={metric}
          onPinMove={setPin}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
          <button
            onClick={() => void downloadWorksheet(customers, { metric })}
            disabled={customers.length === 0}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
          >
            Create worksheet (PDF)
          </button>
          <button
            onClick={() =>
              void downloadWorksheet(customers, { metric, solution: true })
            }
            disabled={customers.length === 0}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
          >
            Create solutions (PDF)
          </button>
          <span className="text-xs text-stone-500">
            Both use this exact problem, with{' '}
            {metric === 'rectilinear' ? 'rectilinear' : 'Euclidean'} distances.
          </span>
        </div>
      </div>

      {/* Center of gravity + load-distance scores */}
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="mb-1 text-lg font-semibold text-stone-900">
            Center of gravity
          </h2>
          <p className="mb-4 text-sm text-stone-600">
            The load-weighted average of the customer coordinates.
          </p>
          <div className="flex gap-x-10">
            <div>
              <div className="text-sm font-medium text-stone-600">
                x<sub>CG</sub>
              </div>
              <div className="text-4xl font-bold text-stone-900 tabular-nums">
                {showAnswers ? (cgRounded ? fmt1(cgRounded.x) : 'â€”') : '?'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-stone-600">
                y<sub>CG</sub>
              </div>
              <div className="text-4xl font-bold text-stone-900 tabular-nums">
                {showAnswers ? (cgRounded ? fmt1(cgRounded.y) : 'â€”') : '?'}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-1 text-lg font-semibold text-stone-900">
            Load-distance scores
          </h2>
          <p className="mb-4 text-sm text-stone-600 tabular-nums">
            {metric === 'rectilinear'
              ? 'd = |xâ‚‚ âˆ’ xâ‚| + |yâ‚‚ âˆ’ yâ‚|'
              : 'd = âˆš((xâ‚‚ âˆ’ xâ‚)Â² + (yâ‚‚ âˆ’ yâ‚)Â²)'}
            {'â€ƒÂ·â€ƒLD = Î£ (load Ã— distance)'}
          </p>
          <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
            <div>
              <div className="text-sm font-medium text-stone-600">
                At the center of gravity
                {showAnswers && cgRounded && (
                  <span className="tabular-nums">
                    {' '}
                    ({fmt1(cgRounded.x)}, {fmt1(cgRounded.y)})
                  </span>
                )}
              </div>
              <div className="text-3xl font-bold text-stone-900 tabular-nums">
                {showAnswers ? (ldAtCg !== null ? fmtInt(ldAtCg) : 'â€”') : '?'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-stone-600 tabular-nums">
                At your pin ({fmt1(pin.x)}, {fmt1(pin.y)})
              </div>
              <div className="text-3xl font-bold text-stone-900 tabular-nums">
                {showAnswers ? fmtInt(ldAtPin) : '?'}
              </div>
              {showAnswers && ldDelta !== null && (
                <div className="text-xs text-stone-500 tabular-nums">
                  {ldDelta === 0
                    ? 'same as the CG'
                    : ldDelta > 0
                      ? `+${fmtInt(ldDelta)} vs the CG`
                      : `âˆ’${fmtInt(-ldDelta)} vs the CG â€” your pin beats it`}
                </div>
              )}
            </div>
          </div>

          {customers.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-130 text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                    <th className="py-2 pr-3 font-semibold">Location</th>
                    <th className="py-2 pr-3 text-right font-semibold">Load</th>
                    <th className="py-2 pr-3 text-right font-semibold">
                      Dist. from CG
                    </th>
                    <th className="py-2 pr-3 text-right font-semibold">
                      Load Ã— dist
                    </th>
                    <th className="py-2 pr-3 text-right font-semibold">
                      Dist. from pin
                    </th>
                    <th className="py-2 text-right font-semibold">
                      Load Ã— dist
                    </th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b border-stone-100 last:border-0">
                      <td className="py-1.5 pr-3 text-stone-700">
                        {c.name || '(unnamed)'}
                      </td>
                      <td className="py-1.5 pr-3 text-right text-stone-700">
                        {fmtInt(c.load)}
                      </td>
                      {showAnswers ? (
                        <>
                          <td className="py-1.5 pr-3 text-right text-stone-700">
                            {cgRounded ? fmt1(distance(metric, c, cgRounded)) : 'â€”'}
                          </td>
                          <td className="py-1.5 pr-3 text-right text-stone-700">
                            {cgRounded
                              ? fmtInt(c.load * distance(metric, c, cgRounded))
                              : 'â€”'}
                          </td>
                          <td className="py-1.5 pr-3 text-right text-stone-700">
                            {fmt1(distance(metric, c, pin))}
                          </td>
                          <td className="py-1.5 text-right text-stone-700">
                            {fmtInt(c.load * distance(metric, c, pin))}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-1.5 pr-3"><Blank w="w-10" /></td>
                          <td className="py-1.5 pr-3"><Blank /></td>
                          <td className="py-1.5 pr-3"><Blank w="w-10" /></td>
                          <td className="py-1.5"><Blank /></td>
                        </>
                      )}
                    </tr>
                  ))}
                  <tr className="border-t border-stone-300 font-semibold text-stone-900">
                    <td className="py-2 pr-3">LD score</td>
                    <td className="py-2 pr-3 text-right">{fmtInt(total)}</td>
                    <td className="py-2 pr-3" />
                    {showAnswers ? (
                      <td className="py-2 pr-3 text-right">
                        {ldAtCg !== null ? fmtInt(ldAtCg) : 'â€”'}
                      </td>
                    ) : (
                      <td className="py-2 pr-3"><Blank /></td>
                    )}
                    <td className="py-2 pr-3" />
                    {showAnswers ? (
                      <td className="py-2 text-right">{fmtInt(ldAtPin)}</td>
                    ) : (
                      <td className="py-2"><Blank /></td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Customer table editor */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-stone-900">The customers</h2>
          <p className="text-sm text-stone-600">
            Click a cell to edit â€” everything recomputes as you type.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-110 text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                <th className="py-2 pr-2 font-semibold">Location</th>
                <th className="w-20 py-2 pr-2 font-semibold">x</th>
                <th className="w-20 py-2 pr-2 font-semibold">y</th>
                <th className="w-32 py-2 pr-2 font-semibold">Load (tons)</th>
                <th className="w-28 py-2 pr-2 text-right font-semibold">
                  % of total
                </th>
                <th className="w-9 py-2" aria-label="Delete row" />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-stone-100 last:border-0">
                  <td className="py-1 pr-2">
                    <input
                      type="text"
                      value={c.name}
                      placeholder="(location)"
                      onChange={(e) => patchCustomer(c.id, { name: e.target.value })}
                      aria-label="Location name"
                      className={CELL_INPUT}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      min={0}
                      max={GRID_MAX_X}
                      value={c.x}
                      onChange={(e) => setCoord(c.id, 'x', Number(e.target.value))}
                      aria-label={`x coordinate for ${c.name || 'customer'}`}
                      className={`${CELL_INPUT} tabular-nums`}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      min={0}
                      max={GRID_MAX_Y}
                      value={c.y}
                      onChange={(e) => setCoord(c.id, 'y', Number(e.target.value))}
                      aria-label={`y coordinate for ${c.name || 'customer'}`}
                      className={`${CELL_INPUT} tabular-nums`}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={c.load}
                      onChange={(e) => setLoad(c.id, Number(e.target.value))}
                      aria-label={`Load in tons for ${c.name || 'customer'}`}
                      className={`${CELL_INPUT} tabular-nums`}
                    />
                  </td>
                  <td className="py-1 pr-2 text-right text-stone-600 tabular-nums">
                    {total > 0 ? `${fmt1((c.load / total) * 100)}%` : 'â€”'}
                  </td>
                  <td className="py-1">
                    <button
                      onClick={() => deleteCustomer(c.id)}
                      title={`Delete ${c.name || 'this customer'}`}
                      aria-label={`Delete ${c.name || 'customer'}`}
                      className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-red-700"
                    >
                      Ã—
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length > 0 && (
                <tr className="border-t border-stone-300 font-medium">
                  <td className="py-2 pr-2 font-semibold text-stone-800">Total</td>
                  <td className="py-2 pr-2" />
                  <td className="py-2 pr-2" />
                  <td className="py-2 pr-2 pl-1.5 text-stone-900 tabular-nums">
                    {fmtInt(total)}
                  </td>
                  <td className="py-2 pr-2 text-right text-stone-600 tabular-nums">
                    {total > 0 ? '100.0%' : 'â€”'}
                  </td>
                  <td className="py-2" />
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-2">
          <button
            onClick={addCustomer}
            disabled={customers.length >= MAX_CUSTOMERS}
            className="rounded-lg border border-dashed border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40"
          >
            + Add row
          </button>
        </div>
      </div>

    </div>
  )
}
