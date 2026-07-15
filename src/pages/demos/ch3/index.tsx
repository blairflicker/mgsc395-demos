import { useEffect, useRef, useState } from 'react'
import DemoHeader from '../../../components/DemoHeader'
import {
  CLASS_DGP,
  CLASS_SAMPLES,
  FACTORS,
  MAX_N,
  MIN_N,
  limits,
  makeShelf,
  makeSubgroup,
  randomDgp,
  verdict,
  type Dgp,
  type Subgroup,
  type VerdictStatus,
} from '../../../lib/spc'
import { ControlCharts } from './Charts'

const classSubgroups = (): Subgroup[] =>
  CLASS_SAMPLES.map((values, i) => makeSubgroup(`c${i + 1}`, values))

/** validated palette: bottle water in teal */
const WATER = '#0d9488'

function Bottle({
  value,
  picked,
  revealed,
  disabled,
  onClick,
  label,
}: {
  value: number
  picked: boolean
  revealed: boolean
  disabled: boolean
  onClick: () => void
  label: string
}) {
  const frac = Math.min(0.97, Math.max(0.06, (value - 11.3) / 1.4))
  const bodyTop = 20
  const bodyH = 38
  const fillH = frac * bodyH
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={picked}
      aria-label={label}
      className={
        picked
          ? 'rounded-lg border border-garnet-400 bg-garnet-50/40 p-1 ring-2 ring-garnet-200'
          : 'rounded-lg border border-stone-200 bg-white p-1 hover:border-stone-400 disabled:hover:border-stone-200'
      }
    >
      <svg viewBox="0 0 44 64" className="mx-auto h-14 w-10" aria-hidden>
        <rect x="17" y="2" width="10" height="5" rx="1.5" fill="#57534e" />
        <path
          d="M18,7 L26,7 L26,12 L31,18 L31,58 Q31,61 28,61 L16,61 Q13,61 13,58 L13,18 L18,12 Z"
          fill="#fafaf9"
          stroke="#a8a29e"
          strokeWidth="1.4"
        />
        {revealed ? (
          <rect
            x="14.5"
            y={bodyTop + (bodyH - fillH)}
            width="15"
            height={fillH}
            fill={WATER}
            fillOpacity="0.55"
          />
        ) : (
          <text
            x="22"
            y="45"
            textAnchor="middle"
            fontSize="15"
            fontWeight="600"
            fill="#a8a29e"
          >
            ?
          </text>
        )}
      </svg>
      <span className="block h-4 text-center text-[11px] text-stone-600 tabular-nums">
        {revealed ? value.toFixed(2) : ''}
      </span>
    </button>
  )
}

/** k distinct random indices from 0..size−1 */
function randomIndices(k: number, size: number): number[] {
  const all = Array.from({ length: size }, (_, i) => i)
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[all[i], all[j]] = [all[j], all[i]]
  }
  return all.slice(0, k)
}

const VERDICT_STYLE: Record<VerdictStatus, { label: string; cls: string }> = {
  insufficient: { label: 'Too early to call', cls: 'text-stone-500' },
  'in-control': { label: 'In control', cls: 'text-teal-700' },
  questionable: { label: 'Questionable', cls: 'text-amber-700' },
  out: { label: 'Out of control', cls: 'text-garnet-800' },
}

export default function Ch3QualityControl() {
  const [n, setN] = useState(5)
  const [dgp, setDgp] = useState<Dgp>({ ...CLASS_DGP })
  const [subgroups, setSubgroups] = useState<Subgroup[]>(classSubgroups)
  const [shelf, setShelf] = useState<number[]>(() => makeShelf(CLASS_DGP, 11))
  const [picked, setPicked] = useState<number[]>([])
  const [showAnswers, setShowAnswers] = useState(true)
  const idRef = useRef(1)

  useEffect(() => {
    document.title = 'Quality Control · MGSC 395'
    return () => {
      document.title = 'MGSC 395 · Interactive Demos'
    }
  }, [])

  const t = subgroups.length + 1
  const complete = picked.length === n
  const lim = limits(subgroups, n)
  const verd = verdict(subgroups, lim)
  const f = FACTORS[n]

  const toggleBottle = (i: number) => {
    if (complete) return
    setPicked((p) =>
      p.includes(i) ? p.filter((x) => x !== i) : p.length < n ? [...p, i] : p,
    )
  }

  const seal = () => {
    if (!complete) return
    const values = picked.map((i) => shelf[i])
    setSubgroups((list) => [...list, makeSubgroup(`b${idRef.current++}`, values)])
    setShelf(makeShelf(dgp, t + 1))
    setPicked([])
  }

  const autoSample = (count: number) => {
    const next = [...subgroups]
    let sh = shelf
    for (let k = 0; k < count; k++) {
      const values = randomIndices(n, sh.length).map((i) => sh[i])
      next.push(makeSubgroup(`b${idRef.current++}`, values))
      sh = makeShelf(dgp, next.length + 1)
    }
    setSubgroups(next)
    setShelf(sh)
    setPicked([])
  }

  const changeDgp = (patch: Partial<Dgp>) => {
    const next = { ...dgp, ...patch, t0: t }
    setDgp(next)
    setShelf(makeShelf(next, t))
    setPicked([])
  }

  const changeN = (value: number) => {
    if (!Number.isFinite(value)) return
    const v = Math.min(MAX_N, Math.max(MIN_N, Math.round(value)))
    const next = { ...dgp, t0: 1 }
    setN(v)
    setDgp(next)
    setSubgroups([])
    setShelf(makeShelf(next, 1))
    setPicked([])
  }

  const clearSamples = () => {
    const next = { ...dgp, t0: 1 }
    setDgp(next)
    setSubgroups([])
    setShelf(makeShelf(next, 1))
    setPicked([])
  }

  // ── practice toolbar ────────────────────────────────────
  const isClassData =
    n === 5 &&
    subgroups.length === CLASS_SAMPLES.length &&
    subgroups[0]?.id === 'c1' &&
    dgp.meanPattern === CLASS_DGP.meanPattern &&
    dgp.varPattern === CLASS_DGP.varPattern &&
    dgp.sigma === CLASS_DGP.sigma &&
    dgp.strength === CLASS_DGP.strength

  const backToClass = () => {
    setN(5)
    setDgp({ ...CLASS_DGP })
    setSubgroups(classSubgroups())
    setShelf(makeShelf(CLASS_DGP, 11))
    setPicked([])
    setShowAnswers(true)
  }

  const makeRandom = () => {
    const d = randomDgp()
    setDgp(d)
    setSubgroups([])
    setShelf(makeShelf(d, 1))
    setPicked([])
    setShowAnswers(false)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DemoHeader label="Chapter 3 · Quality" title="The Sampling Lab">
        Box samples off the shelf, build the X̄ and R charts, and decide
        whether the process is in control.
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
        <button
          onClick={clearSamples}
          disabled={subgroups.length === 0}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
        >
          Clear samples
        </button>
      </div>

      {/* The data-generating process — the answer under the hood */}
      {showAnswers && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-lg font-semibold text-stone-900">
            Under the hood
          </h2>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <div>
              <span className="mb-1 block text-xs font-semibold text-stone-500 uppercase">
                Process mean
              </span>
              <div className="flex overflow-hidden rounded-lg border border-stone-300 text-sm">
                {(
                  [
                    ['stable', 'Stable'],
                    ['up', 'Increasing'],
                    ['down', 'Decreasing'],
                    ['seasonal', 'Seasonal'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => changeDgp({ meanPattern: value })}
                    aria-pressed={dgp.meanPattern === value}
                    className={
                      dgp.meanPattern === value
                        ? 'bg-garnet-800 px-3 py-1.5 font-medium text-white'
                        : 'bg-white px-3 py-1.5 text-stone-700 hover:bg-stone-50'
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-1 block text-xs font-semibold text-stone-500 uppercase">
                Variability
              </span>
              <div className="flex overflow-hidden rounded-lg border border-stone-300 text-sm">
                {(
                  [
                    ['stable', 'Stable'],
                    ['increasing', 'Increasing'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => changeDgp({ varPattern: value })}
                    aria-pressed={dgp.varPattern === value}
                    className={
                      dgp.varPattern === value
                        ? 'bg-garnet-800 px-3 py-1.5 font-medium text-white'
                        : 'bg-white px-3 py-1.5 text-stone-700 hover:bg-stone-50'
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-stone-500 uppercase">
                Bottle-to-bottle <span className="normal-case">σ</span>
              </span>
              <span className="flex items-center gap-2">
                <input
                  type="range"
                  min={0.02}
                  max={0.3}
                  step={0.01}
                  value={dgp.sigma}
                  onChange={(e) => changeDgp({ sigma: Number(e.target.value) })}
                  className="w-28 accent-garnet-700"
                />
                <span className="w-16 text-sm text-stone-600 tabular-nums">
                  {dgp.sigma.toFixed(2)} oz
                </span>
              </span>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-stone-500 uppercase">
                Strength
              </span>
              <span className="flex items-center gap-2">
                <input
                  type="range"
                  min={0.01}
                  max={0.1}
                  step={0.01}
                  value={dgp.strength}
                  disabled={dgp.meanPattern === 'stable' && dgp.varPattern === 'stable'}
                  onChange={(e) => changeDgp({ strength: Number(e.target.value) })}
                  className="w-28 accent-garnet-700 disabled:opacity-40"
                />
                <span
                  className={`w-24 text-sm tabular-nums ${
                    dgp.meanPattern === 'stable' && dgp.varPattern === 'stable'
                      ? 'text-stone-400'
                      : 'text-stone-600'
                  }`}
                >
                  {dgp.strength.toFixed(2)} / sample
                </span>
              </span>
            </label>
          </div>
        </div>
      )}

      {/* The shelf */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">
              The shelf — sample {t}
            </h2>
            <p className="text-sm text-stone-600">
              {complete
                ? 'Sample complete — the fills you measured are revealed.'
                : `Click ${n} bottles; fills stay hidden until the sample is complete.`}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-600">
            Bottles per box (n)
            <input
              type="number"
              min={MIN_N}
              max={MAX_N}
              value={n}
              onChange={(e) => changeN(Number(e.target.value))}
              aria-label="Sample size n"
              className="w-16 rounded border border-stone-300 bg-white px-2 py-1 text-sm tabular-nums focus:border-garnet-400 focus:outline-none"
            />
          </label>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {shelf.map((v, i) => (
            <Bottle
              key={`${t}-${i}`}
              value={v}
              picked={picked.includes(i)}
              revealed={complete && picked.includes(i)}
              disabled={complete && !picked.includes(i)}
              onClick={() => toggleBottle(i)}
              label={`Bottle ${i + 1}${picked.includes(i) ? ' (in your sample)' : ''}`}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={seal}
            disabled={!complete}
            className="rounded-lg bg-garnet-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-garnet-700 disabled:opacity-40"
          >
            {complete ? 'Seal the box' : `Seal the box (${picked.length}/${n})`}
          </button>
          <button
            onClick={() => autoSample(1)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Auto-sample
          </button>
          <button
            onClick={() => autoSample(5)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Auto-sample ×5
          </button>
        </div>
      </div>

      {/* The boxes — only X̄ and R survive */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold text-stone-900">The boxes</h2>
        {subgroups.length === 0 ? (
          <p className="py-2 text-sm text-stone-500">
            No boxes yet — seal your first sample above.
          </p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {subgroups.map((g, i) => (
              <div
                key={g.id}
                className="min-w-24 shrink-0 rounded-lg border border-stone-300 bg-stone-50 px-2.5 py-2 text-center"
              >
                <div className="text-xs font-semibold text-stone-500">#{i + 1}</div>
                <div className="text-sm text-stone-800 tabular-nums">
                  X̄ {g.mean.toFixed(2)}
                </div>
                <div className="text-sm text-stone-800 tabular-nums">
                  R {g.range.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* The charts */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-stone-900">
            The control charts
          </h2>
          <span className="text-xs text-stone-500 tabular-nums">
            n = {n} → A₂ = {f.A2} · D₃ = {f.D3} · D₄ = {f.D4}
          </span>
        </div>
        {lim === null ? (
          <p className="py-4 text-center text-sm text-stone-500">
            The charts appear once the first box is sealed.
          </p>
        ) : (
          <ControlCharts subgroups={subgroups} lim={lim} highlight={showAnswers} />
        )}
        {showAnswers && (
          <div className="mt-4 border-t border-stone-100 pt-3">
            <span className={`text-sm font-bold ${VERDICT_STYLE[verd.status].cls}`}>
              {VERDICT_STYLE[verd.status].label}
            </span>
            <span className="ml-2 text-sm text-stone-600">{verd.detail}</span>
          </div>
        )}
      </div>
    </div>
  )
}
