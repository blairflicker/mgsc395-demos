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

/** seconds for a bottle to cross the belt (1,400 px of travel) */
const BELT_DUR = 45
/** seconds between bottles appearing on the right */
const SPAWN_S = 1.8
/** bottles pre-placed along the belt on a fresh line */
const INITIAL_BOTTLES = 24

interface LineBottle {
  id: number
  value: number
  /** negative delays pre-place a bottle partway down the belt */
  delay: number
}

let bottleSeq = 1

const freshLine = (dgp: Dgp, t: number): LineBottle[] =>
  makeShelf(dgp, t, INITIAL_BOTTLES).map((value, i) => ({
    id: bottleSeq++,
    value,
    delay: -(i * SPAWN_S),
  }))

function BottleGlyph({
  value = 0,
  revealed = false,
  className = 'h-14 w-10',
}: {
  value?: number
  revealed?: boolean
  className?: string
}) {
  const frac = Math.min(0.97, Math.max(0.06, (value - 11.3) / 1.4))
  const bodyTop = 20
  const bodyH = 38
  const fillH = frac * bodyH
  return (
    <svg viewBox="0 0 44 64" className={className} aria-hidden>
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
          fill="#0d9488"
          fillOpacity="0.55"
        />
      ) : (
        <text x="22" y="45" textAnchor="middle" fontSize="15" fontWeight="600" fill="#a8a29e">
          ?
        </text>
      )}
    </svg>
  )
}

/** "a + b + … " with every value spelled out — the point is the arithmetic */
const sumText = (values: number[]): string =>
  values.map((v) => v.toFixed(2)).join(' + ')

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
  const [line, setLine] = useState<LineBottle[]>(() => freshLine(CLASS_DGP, 11))
  const [tray, setTray] = useState<number[]>([])
  const [showAnswers, setShowAnswers] = useState(true)
  const [selBox, setSelBox] = useState<number | null>(null)
  const idRef = useRef(1)

  useEffect(() => {
    document.title = 'Quality Control · MGSC 395'
    return () => {
      document.title = 'MGSC 395 · Interactive Demos'
    }
  }, [])

  const t = subgroups.length + 1
  const complete = tray.length === n
  const lim = limits(subgroups, n)
  const verd = verdict(subgroups, lim)
  const f = FACTORS[n]

  // new bottles keep appearing on the right of the belt
  useEffect(() => {
    const iv = setInterval(() => {
      const value = makeShelf(dgp, t, 1)[0]
      setLine((l) => [...l.slice(-40), { id: bottleSeq++, value, delay: 0 }])
    }, SPAWN_S * 1000)
    return () => clearInterval(iv)
  }, [dgp, t])

  const bottleGone = (id: number) => {
    setLine((l) => l.filter((b) => b.id !== id))
  }

  const pick = (id: number) => {
    if (complete) return
    const bottle = line.find((b) => b.id === id)
    if (!bottle) return
    setLine((l) => l.filter((b) => b.id !== id))
    setTray((s) => (s.length < n ? [...s, bottle.value] : s))
  }

  const seal = () => {
    if (!complete) return
    setSubgroups((list) => [...list, makeSubgroup(`b${idRef.current++}`, tray)])
    setTray([])
    setSelBox(null)
  }

  const autoSample = (count: number) => {
    setSubgroups((list) => {
      const next = [...list]
      for (let k = 0; k < count; k++) {
        next.push(makeSubgroup(`b${idRef.current++}`, makeShelf(dgp, next.length + 1, n)))
      }
      return next
    })
    setTray([])
    setSelBox(null)
  }

  const changeDgp = (patch: Partial<Dgp>) => {
    setDgp({ ...dgp, ...patch, t0: t })
  }

  const changeN = (value: number) => {
    if (!Number.isFinite(value)) return
    const v = Math.min(MAX_N, Math.max(MIN_N, Math.round(value)))
    const next = { ...dgp, t0: 1 }
    setN(v)
    setDgp(next)
    setSubgroups([])
    setLine(freshLine(next, 1))
    setTray([])
    setSelBox(null)
  }

  const clearSamples = () => {
    const next = { ...dgp, t0: 1 }
    setDgp(next)
    setSubgroups([])
    setLine(freshLine(next, 1))
    setTray([])
    setSelBox(null)
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
    setLine(freshLine(CLASS_DGP, 11))
    setTray([])
    setSelBox(null)
    setShowAnswers(true)
  }

  const makeRandom = () => {
    const d = randomDgp()
    setDgp(d)
    setSubgroups([])
    setLine(freshLine(d, 1))
    setTray([])
    setSelBox(null)
    setShowAnswers(false)
  }

  // the box whose contents are spelled out under the row: the clicked box,
  // or the latest one when nothing is locked in
  const locked = selBox !== null && selBox < subgroups.length ? selBox : null
  const detailIndex = locked ?? (subgroups.length > 0 ? subgroups.length - 1 : null)
  const detail = detailIndex !== null ? subgroups[detailIndex] : null

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DemoHeader label="Chapter 3 · Quality" title="The Sampling Lab">
        Pick bottles off the line, box the samples, and decide from the X̄
        and R charts whether the process is in control.
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

      {/* The assembly line */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">
              The assembly line — sample {t}
            </h2>
            <p className="text-sm text-stone-600">
              {complete
                ? 'Sample complete — seal the box to measure it.'
                : `Pick ${n} bottles off the line as they go by.`}
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
        <div className="relative h-24 overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-2 rounded bg-stone-200" />
          {line.map((b) => (
            <button
              key={b.id}
              onClick={() => pick(b.id)}
              onAnimationEnd={() => bottleGone(b.id)}
              disabled={complete}
              aria-label="Take this bottle off the line"
              className="ch3-belt-move absolute top-0 rounded px-2 py-3 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-garnet-400 disabled:cursor-default"
              style={{
                right: -56,
                animationDuration: `${BELT_DUR}s`,
                animationDelay: `${b.delay}s`,
              }}
            >
              <BottleGlyph />
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-stone-100 pt-3">
          <span className="text-xs font-semibold text-stone-500 uppercase">
            Current sample
          </span>
          <span className="flex items-start gap-1.5">
            {Array.from({ length: n }, (_, i) => (
              <span
                key={i}
                className={
                  i < tray.length
                    ? 'flex w-12 flex-col items-center'
                    : 'flex h-16 w-12 flex-col items-center rounded-lg border border-dashed border-stone-300'
                }
              >
                {i < tray.length && (
                  <>
                    <BottleGlyph
                      value={tray[i]}
                      revealed={complete}
                      className="h-12 w-8"
                    />
                    <span className="block h-4 text-center text-[11px] text-stone-600 tabular-nums">
                      {complete ? tray[i].toFixed(2) : ''}
                    </span>
                  </>
                )}
              </span>
            ))}
          </span>
          <button
            onClick={seal}
            disabled={!complete}
            className="rounded-lg bg-garnet-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-garnet-700 disabled:opacity-40"
          >
            {complete ? 'Seal the box' : `Seal the box (${tray.length}/${n})`}
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
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {subgroups.map((g, i) => (
                <button
                  key={g.id}
                  onClick={() => setSelBox((s) => (s === i ? null : i))}
                  aria-pressed={locked === i}
                  aria-label={`Inspect box ${i + 1}`}
                  className={
                    locked === i
                      ? 'min-w-24 shrink-0 rounded-lg border border-garnet-400 bg-garnet-50/60 px-2.5 py-2 text-center ring-2 ring-garnet-200'
                      : detailIndex === i
                        ? 'min-w-24 shrink-0 rounded-lg border border-garnet-300 bg-garnet-50/30 px-2.5 py-2 text-center hover:border-garnet-400'
                        : 'min-w-24 shrink-0 rounded-lg border border-stone-300 bg-stone-50 px-2.5 py-2 text-center hover:border-garnet-300'
                  }
                >
                  <div className="text-xs font-semibold text-stone-500">#{i + 1}</div>
                  <div className="text-sm text-stone-800 tabular-nums">
                    X̄ {g.mean.toFixed(2)}
                  </div>
                  <div className="text-sm text-stone-800 tabular-nums">
                    R {g.range.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-3 min-h-28 space-y-1 border-t border-stone-100 pt-3 text-sm text-stone-700 tabular-nums">
              {detail && (
                <>
                  <div>
                    <span className="font-semibold text-stone-900">
                      Box #{(detailIndex ?? 0) + 1}
                    </span>{' '}
                    <span className="text-stone-400">
                      {locked !== null ? '(selected — click it again to release)' : '(latest)'}
                    </span>
                  </div>
                  <div className="break-words">
                    Observations: {detail.values.map((v) => v.toFixed(2)).join(', ')}
                  </div>
                  <div className="break-words">
                    X̄ = ({detail.values.map((v) => v.toFixed(2)).join(' + ')}) /{' '}
                    {detail.values.length} = {detail.mean.toFixed(2)}
                  </div>
                  <div>
                    R = {Math.max(...detail.values).toFixed(2)} −{' '}
                    {Math.min(...detail.values).toFixed(2)} = {detail.range.toFixed(2)}
                  </div>
                </>
              )}
            </div>
          </>
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

      {/* The hand calculations behind the charts */}
      {showAnswers && lim !== null && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-lg font-semibold text-stone-900">
            The calculations
          </h2>
          <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
            <div>
              <h3 className="mb-1.5 max-w-56 text-sm font-semibold text-stone-800">
                Factors for Calculating Three Sigma Limits for the X̄-Chart and
                R-Chart
              </h3>
              <table className="text-sm tabular-nums">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                  <th className="py-1.5 pr-5 font-semibold">n</th>
                  <th className="py-1.5 pr-5 text-right font-semibold">A₂</th>
                  <th className="py-1.5 pr-5 text-right font-semibold">D₃</th>
                  <th className="py-1.5 text-right font-semibold">D₄</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(FACTORS).map(([size, fac]) => (
                  <tr
                    key={size}
                    className={
                      Number(size) === n
                        ? 'border-b border-stone-100 bg-garnet-50 font-semibold text-garnet-900'
                        : 'border-b border-stone-100 text-stone-700 last:border-0'
                    }
                  >
                    <td className="py-0.5 pr-5 pl-1">{size}</td>
                    <td className="py-0.5 pr-5 text-right">{fac.A2.toFixed(3)}</td>
                    <td className="py-0.5 pr-5 text-right">{fac.D3.toFixed(3)}</td>
                    <td className="py-0.5 pr-1 text-right">{fac.D4.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
            <div className="min-w-0 flex-1 basis-80 space-y-4 text-sm text-stone-700 tabular-nums">
              <div className="space-y-1.5">
                <p className="break-words">
                  X̿ = ({sumText(subgroups.map((g) => g.mean))}) /{' '}
                  {subgroups.length} = {lim.xbarbar.toFixed(2)}
                </p>
                <p className="break-words">
                  R̄ = ({sumText(subgroups.map((g) => g.range))}) /{' '}
                  {subgroups.length} = {lim.rbar.toFixed(2)}
                </p>
              </div>
              <div className="space-y-1.5">
                <p>
                  UCL<sub>X̄</sub> = X̿ + A₂R̄ = {lim.xbarbar.toFixed(2)} + {f.A2} ×{' '}
                  {lim.rbar.toFixed(2)} = {lim.uclX.toFixed(2)}
                </p>
                <p>
                  LCL<sub>X̄</sub> = X̿ − A₂R̄ = {lim.xbarbar.toFixed(2)} − {f.A2} ×{' '}
                  {lim.rbar.toFixed(2)} = {lim.lclX.toFixed(2)}
                </p>
              </div>
              <div className="space-y-1.5">
                <p>
                  UCL<sub>R</sub> = D₄R̄ = {f.D4} × {lim.rbar.toFixed(2)} ={' '}
                  {lim.uclR.toFixed(2)}
                </p>
                <p>
                  LCL<sub>R</sub> = D₃R̄ = {f.D3} × {lim.rbar.toFixed(2)} ={' '}
                  {lim.lclR.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
