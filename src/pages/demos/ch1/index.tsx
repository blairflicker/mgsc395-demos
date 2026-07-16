import { useEffect, useState } from 'react'
import DemoHeader from '../../../components/DemoHeader'
import {
  CLASS_CASE,
  randomCase,
  totalDollars,
  type InputKind,
  type InputRow,
  type Transformation,
} from '../../../lib/productivity'

/** validated palette — one color per input kind, stone for the output */
const KIND_COLOR: Record<InputKind, string> = {
  labor: '#1d4ed8',
  materials: '#0d9488',
  overhead: '#b45309',
}
const OUTPUT_COLOR = '#44403c'

const CELL_INPUT =
  'w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm ' +
  'hover:border-stone-200 focus:border-garnet-400 focus:bg-white focus:outline-none'

const fmtQty = (v: number) =>
  v.toLocaleString('en-US', { maximumFractionDigits: 2 })

/** dollars are just another unit — write the word, no "$" prefix */
const fmtDollars = (v: number) => `${fmtQty(v)} dollars`

/** ratios read like the slides: 2 → "2.0", 22.5 → "22.5" */
const fmtRatio = (v: number) =>
  v.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(Math.round(v * 100) / 100) ? 1 : 0,
    maximumFractionDigits: 2,
  })

/** singular for a denominator unit: "months" → "month", "dollars" → "dollar" */
const singular = (unit: string) => unit.replace(/s$/, '')

type ValueRow = {
  qty: number
  unit: string
  dollarsPerUnit: number | null
  showDollars: boolean
}

/** the amount + unit a row contributes once its units/dollars toggle is set */
const displayed = (r: ValueRow): { qty: number; unit: string } =>
  r.showDollars && r.dollarsPerUnit !== null
    ? { qty: r.qty * r.dollarsPerUnit, unit: 'dollars' }
    : { qty: r.qty, unit: r.unit }

/** what a transformation chip shows: the math problem (null when there is
 *  none) and the bold final answer, units carried through */
const rowParts = (r: ValueRow): { problem: string | null; answer: string } => {
  if (r.showDollars && r.dollarsPerUnit !== null) {
    return {
      problem: `${fmtQty(r.qty)} ${r.unit} × ${fmtQty(r.dollarsPerUnit)} dollars/${singular(r.unit)}`,
      answer: fmtDollars(r.qty * r.dollarsPerUnit),
    }
  }
  return { problem: null, answer: `${fmtQty(r.qty)} ${r.unit}` }
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function Arrow() {
  return (
    <svg viewBox="0 0 40 24" className="hidden h-6 w-10 self-center md:block" aria-hidden>
      <line x1="2" y1="12" x2="30" y2="12" stroke="#78716c" strokeWidth="2.5" />
      <path d="M28,5 L38,12 L28,19 Z" fill="#78716c" />
    </svg>
  )
}

/** the little numbered network inside the transformation box */
function ProcessNetwork() {
  const nodes = [
    { n: 1, x: 22, y: 22 },
    { n: 2, x: 22, y: 68 },
    { n: 3, x: 62, y: 22 },
    { n: 4, x: 62, y: 68 },
    { n: 5, x: 100, y: 45 },
  ]
  const edges: [number, number][] = [
    [1, 2],
    [1, 4],
    [3, 4],
    [3, 5],
    [4, 5],
  ]
  const at = (n: number) => nodes.find((p) => p.n === n)!
  return (
    <svg viewBox="0 0 120 90" className="mx-auto h-16 w-24" aria-hidden>
      <defs>
        <marker id="ch1-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#a8a29e" />
        </marker>
      </defs>
      {edges.map(([a, b]) => {
        const p = at(a)
        const q = at(b)
        const dx = q.x - p.x
        const dy = q.y - p.y
        const len = Math.hypot(dx, dy)
        const r = 9.5
        return (
          <line
            key={`${a}${b}`}
            x1={p.x + (dx / len) * r}
            y1={p.y + (dy / len) * r}
            x2={q.x - (dx / len) * (r + 4)}
            y2={q.y - (dy / len) * (r + 4)}
            stroke="#a8a29e"
            strokeWidth="1.6"
            markerEnd="url(#ch1-arr)"
          />
        )
      })}
      {nodes.map((p) => (
        <g key={p.n}>
          <circle cx={p.x} cy={p.y} r="9" fill="white" stroke="#78716c" strokeWidth="1.5" />
          <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize="10" fill="#44403c">
            {p.n}
          </text>
        </g>
      ))}
    </svg>
  )
}

/** one input/output card in the transformation: name, the math with units,
 *  and its own units/dollars toggle on the right */
function ValueChip({
  name,
  color,
  problem,
  answer,
  showDollars,
  canDollars,
  onToggle,
  selectable,
  selected,
  onSelect,
}: {
  name: string
  color: string
  problem: string | null
  answer: string
  showDollars: boolean
  canDollars: boolean
  onToggle: () => void
  selectable?: boolean
  selected?: boolean
  onSelect?: () => void
}) {
  const body = (
    <>
      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="min-w-0">
        <span className="block text-xs text-stone-500">{name}</span>
        {problem && (
          <span className="block text-sm text-stone-700 tabular-nums">{problem}</span>
        )}
        <span className="block text-sm font-semibold text-stone-900 tabular-nums">
          {problem ? `= ${answer}` : answer}
        </span>
      </span>
    </>
  )
  return (
    <div
      className={`flex min-h-18 items-start gap-2 rounded-lg border bg-white px-2.5 py-1.5 ${
        selected ? 'border-garnet-400 ring-2 ring-garnet-200' : 'border-stone-200'
      }`}
    >
      {selectable ? (
        <button
          onClick={onSelect}
          aria-pressed={selected}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-2">{body}</div>
      )}
      <button
        onClick={onToggle}
        disabled={!canDollars}
        aria-pressed={showDollars}
        className="mt-0.5 w-16 shrink-0 rounded-lg border border-stone-300 bg-white px-2 py-0.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
      >
        {showDollars ? 'dollars' : 'units'}
      </button>
    </div>
  )
}

export default function Ch1Productivity() {
  const [data, setData] = useState<Transformation>(CLASS_CASE)
  const [isClass, setIsClass] = useState(true)
  const [showAnswers, setShowAnswers] = useState(true)
  const [mode, setMode] = useState<'multi' | 'single'>('multi')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Productivity · MGSC 395'
    return () => {
      document.title = 'MGSC 395 · Interactive Demos'
    }
  }, [])

  const { output, inputs } = data
  const selected = inputs.find((r) => r.id === selectedId) ?? inputs[0] ?? null

  // ── editing ─────────────────────────────────────────────
  const patch = (next: Partial<Transformation>) => {
    setData((d) => ({ ...d, ...next }))
    setIsClass(false)
  }
  const patchOutput = (p: Partial<Transformation['output']>) =>
    patch({ output: { ...output, ...p } })
  const patchInput = (id: string, p: Partial<InputRow>) =>
    patch({ inputs: inputs.map((r) => (r.id === id ? { ...r, ...p } : r)) })
  const addInput = () => {
    if (inputs.length >= 6) return
    const used = new Set(inputs.map((r) => r.id))
    let k = 1
    while (used.has(`n${k}`)) k++
    patch({
      inputs: [
        ...inputs,
        { id: `n${k}`, name: '', kind: 'materials', qty: 1, unit: 'units', dollarsPerUnit: null, showDollars: false },
      ],
    })
  }
  const deleteInput = (id: string) => {
    if (inputs.length <= 1) return
    patch({ inputs: inputs.filter((r) => r.id !== id) })
  }

  const backToClass = () => {
    setData(CLASS_CASE)
    setIsClass(true)
    setSelectedId(null)
    setShowAnswers(true)
  }
  const makeRandom = () => {
    setData(randomCase())
    setIsClass(false)
    setSelectedId(null)
    setShowAnswers(false)
  }

  // ── the productivity fraction, careful with units ───────
  const terms = mode === 'single' ? (selected ? [selected] : []) : inputs

  // combine like units in the denominator — dollars are dollars, hours are
  // hours — summing each unit group into a single term
  const groups = new Map<string, number>()
  for (const t of terms) {
    const d = displayed(t)
    groups.set(d.unit, (groups.get(d.unit) ?? 0) + d.qty)
  }
  const denomGroups = [...groups.entries()].map(([unit, qty]) => ({ unit, qty }))
  const num = displayed(output)

  let resultLine: string | null = null
  if (denomGroups.length === 1 && denomGroups[0].qty > 0) {
    const d = denomGroups[0]
    const ratio = num.qty / d.qty
    resultLine =
      d.unit === num.unit
        ? `= ${fmtRatio(ratio)}` // like units cancel — a pure number
        : `= ${fmtRatio(ratio)} ${num.unit} per ${singular(d.unit)}`
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DemoHeader label="Chapter 1 · Productivity" title="Output over Input">
        Build a transformation — inputs on the left, one output on the
        right — and read its productivity off the bottom.
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

      {/* The worksheet */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold text-stone-900">
          The worksheet
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-150 text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                <th className="w-36 py-2 pr-2 font-semibold">Name</th>
                <th className="w-32 py-2 pr-2 font-semibold">Type</th>
                <th className="w-20 py-2 pr-2 font-semibold">Quantity</th>
                <th className="w-44 py-2 pr-2 font-semibold">Dollars / unit</th>
                <th className="w-24 py-2 pr-2 font-semibold">Unit</th>
                <th className="w-32 py-2 pr-2 text-right font-semibold">Total</th>
                <th className="w-9 py-2" aria-label="Delete row" />
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {/* output row */}
              <tr className="border-b border-stone-200 bg-stone-50">
                <td className="py-1 pr-2">
                  <input
                    type="text"
                    value={output.name}
                    placeholder="(output)"
                    onChange={(e) => patchOutput({ name: e.target.value })}
                    aria-label="Output name"
                    className={`${CELL_INPUT} font-medium`}
                  />
                </td>
                <td className="py-1 pr-2 pl-1.5 font-medium text-stone-800">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: OUTPUT_COLOR }}
                    />
                    Output
                  </span>
                </td>
                <td className="py-1 pr-2">
                  <input
                    type="number"
                    min={0}
                    value={output.qty}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      if (Number.isFinite(v)) patchOutput({ qty: Math.max(0, v) })
                    }}
                    aria-label="Output quantity"
                    className={CELL_INPUT}
                  />
                </td>
                <td className="py-1 pr-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={output.dollarsPerUnit ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value
                        if (raw === '') {
                          patchOutput({ dollarsPerUnit: null, showDollars: false })
                          return
                        }
                        const v = Number(raw)
                        if (Number.isFinite(v)) patchOutput({ dollarsPerUnit: Math.max(0, v) })
                      }}
                      aria-label="Output dollars per unit"
                      className={`${CELL_INPUT} w-20`}
                    />
                    {output.dollarsPerUnit !== null && output.unit && (
                      <span className="whitespace-nowrap text-xs text-stone-500">
                        dollars/{singular(output.unit)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-1 pr-2">
                  <input
                    type="text"
                    value={output.unit}
                    onChange={(e) => patchOutput({ unit: e.target.value })}
                    aria-label="Output unit"
                    className={CELL_INPUT}
                  />
                </td>
                <td className="py-1 pr-2 text-right text-stone-700">
                  {totalDollars(output) !== null ? fmtDollars(totalDollars(output)!) : '—'}
                </td>
                <td className="py-1" />
              </tr>
              {/* input rows */}
              {inputs.map((r) => (
                <tr key={r.id} className="border-b border-stone-100 last:border-0">
                  <td className="py-1 pr-2">
                    <input
                      type="text"
                      value={r.name}
                      placeholder="(input)"
                      onChange={(e) => patchInput(r.id, { name: e.target.value })}
                      aria-label="Input name"
                      className={CELL_INPUT}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: KIND_COLOR[r.kind] }}
                      />
                      <select
                        value={r.kind}
                        onChange={(e) =>
                          patchInput(r.id, { kind: e.target.value as InputKind })
                        }
                        aria-label={`Kind of ${r.name || 'input'}`}
                        className="rounded border border-transparent bg-transparent py-0.5 text-sm hover:border-stone-200 focus:border-garnet-400 focus:bg-white focus:outline-none"
                      >
                        <option value="labor">labor</option>
                        <option value="materials">materials</option>
                        <option value="overhead">overhead</option>
                      </select>
                    </span>
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      min={0}
                      value={r.qty}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        if (Number.isFinite(v)) patchInput(r.id, { qty: Math.max(0, v) })
                      }}
                      aria-label={`Quantity of ${r.name || 'input'}`}
                      className={CELL_INPUT}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={r.dollarsPerUnit ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value
                          if (raw === '') {
                            patchInput(r.id, { dollarsPerUnit: null, showDollars: false })
                            return
                          }
                          const v = Number(raw)
                          if (Number.isFinite(v))
                            patchInput(r.id, { dollarsPerUnit: Math.max(0, v) })
                        }}
                        aria-label={`Dollars per unit of ${r.name || 'input'}`}
                        className={`${CELL_INPUT} w-20`}
                      />
                      {r.dollarsPerUnit !== null && r.unit && (
                        <span className="whitespace-nowrap text-xs text-stone-500">
                          dollars/{singular(r.unit)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="text"
                      value={r.unit}
                      onChange={(e) => patchInput(r.id, { unit: e.target.value })}
                      aria-label={`Unit of ${r.name || 'input'}`}
                      className={CELL_INPUT}
                    />
                  </td>
                  <td className="py-1 pr-2 text-right text-stone-700">
                    {totalDollars(r) !== null ? fmtDollars(totalDollars(r)!) : '—'}
                  </td>
                  <td className="py-1">
                    <button
                      onClick={() => deleteInput(r.id)}
                      disabled={inputs.length <= 1}
                      title={inputs.length <= 1 ? 'Keep at least 1 input' : `Delete ${r.name || 'input'}`}
                      aria-label={`Delete ${r.name || 'input'}`}
                      className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-red-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-stone-400"
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2">
          <button
            onClick={addInput}
            disabled={inputs.length >= 6}
            className="rounded-lg border border-dashed border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40"
          >
            + Add input
          </button>
        </div>
      </div>

      {/* The transformation */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-stone-900">
            The transformation
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
            {(Object.keys(KIND_COLOR) as InputKind[]).map((k) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: KIND_COLOR[k] }} />
                {k}
              </span>
            ))}
          </div>
        </div>
        <div className="grid items-stretch gap-2 md:grid-cols-[1.5fr_auto_0.7fr_auto_1.5fr]">
          <div className="rounded-xl border border-stone-300 bg-stone-50/60 p-3">
            <div className="mb-2 text-center text-sm font-semibold text-stone-800">
              Inputs
            </div>
            <div className="flex flex-col items-stretch gap-1.5">
              {inputs.map((r) => (
                <ValueChip
                  key={r.id}
                  name={r.name || '(input)'}
                  color={KIND_COLOR[r.kind]}
                  {...rowParts(r)}
                  showDollars={r.showDollars}
                  canDollars={r.dollarsPerUnit !== null}
                  onToggle={() => patchInput(r.id, { showDollars: !r.showDollars })}
                  selectable={mode === 'single'}
                  selected={mode === 'single' && selected?.id === r.id}
                  onSelect={() => setSelectedId(r.id)}
                />
              ))}
            </div>
          </div>
          <Arrow />
          <div className="rounded-xl border border-stone-300 bg-stone-50/60 p-3">
            <div className="mb-2 text-center text-sm font-semibold text-stone-800">
              Processes and<br />operations
            </div>
            <ProcessNetwork />
          </div>
          <Arrow />
          <div className="rounded-xl border border-stone-300 bg-stone-50/60 p-3">
            <div className="mb-2 text-center text-sm font-semibold text-stone-800">
              Outputs
            </div>
            <div className="flex flex-col items-stretch gap-1.5">
              <ValueChip
                name={output.name || '(output)'}
                color={OUTPUT_COLOR}
                {...rowParts(output)}
                showDollars={output.showDollars}
                canDollars={output.dollarsPerUnit !== null}
                onToggle={() => patchOutput({ showDollars: !output.showDollars })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* The productivity */}
      {showAnswers && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-stone-900">
              The productivity
            </h2>
            <div className="flex overflow-hidden rounded-lg border border-stone-300 text-sm">
              {(
                [
                  ['multi', 'Multifactor'],
                  ['single', 'Single-factor'],
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
          {terms.length === 0 ? (
            <p className="py-2 text-sm text-stone-500">Add an input above.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-lg text-stone-800 tabular-nums">
              <span className="inline-flex flex-col items-center">
                <span className="px-2">
                  {fmtQty(num.qty)} {num.unit}
                </span>
                <span className="w-full border-t-2 border-stone-500" />
                <span className="px-2 text-center">
                  {denomGroups
                    .map((g) => `${fmtQty(g.qty)} ${g.unit}`)
                    .join(' + ')}
                </span>
              </span>
              {resultLine !== null && (
                <span className="font-bold text-stone-900">{resultLine}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
