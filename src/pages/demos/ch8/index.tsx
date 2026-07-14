import { useEffect, useMemo, useState } from 'react'
import DemoHeader from '../../../components/DemoHeader'
import {
  CLASS_DEMAND,
  MAX_ALPHA,
  MAX_MA_N,
  MAX_PERIODS,
  MIN_ALPHA,
  MIN_MA_N,
  MIN_PERIODS,
  errorRows,
  expSmoothingForecast,
  metricsFrom,
  movingAverageForecast,
  naiveForecast,
  randomDemand,
  regressionForecast,
  type ErrorRow,
  type Metrics,
} from '../../../lib/forecast'
import { ForecastChart, type ChartSeries } from './Chart'
import { COLOR_ES, COLOR_MA, COLOR_NAIVE, COLOR_REGRESSION } from './palette'
import { downloadWorksheet } from './worksheet'

type MethodId = 'naive' | 'ma' | 'es' | 'regression'

interface DemandRow {
  /** stable row key, never shown */
  id: string
  demand: number
}

const cloneClass = (): DemandRow[] =>
  CLASS_DEMAND.map((d, i) => ({ id: `p${i + 1}`, demand: d }))

/** Next unused row id of the form p1, p2, … */
function nextRowId(rows: { id: string }[]): string {
  const used = new Set(rows.map((r) => r.id))
  let k = 1
  while (used.has(`p${k}`)) k++
  return `p${k}`
}

const CELL_INPUT =
  'w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm ' +
  'hover:border-stone-200 focus:border-garnet-400 focus:bg-white focus:outline-none'

const fmt1 = (v: number) => v.toFixed(1)
const fmtInt = (v: number) => Math.round(v).toLocaleString('en-US')

export default function Ch8Forecasting() {
  const [rows, setRows] = useState<DemandRow[]>(cloneClass)
  const [enabled, setEnabled] = useState<Record<MethodId, boolean>>({
    naive: true,
    ma: true,
    es: true,
    regression: true,
  })
  const [maN, setMaN] = useState(3)
  const [alpha, setAlpha] = useState(0.7)
  const [showAnswers, setShowAnswers] = useState(true)
  const [openWork, setOpenWork] = useState<Record<MethodId, boolean>>({
    naive: false,
    ma: false,
    es: false,
    regression: false,
  })

  useEffect(() => {
    document.title = 'Forecasting · MGSC 395'
    return () => {
      document.title = 'MGSC 395 · Interactive Demos'
    }
  }, [])

  const demand = useMemo(() => rows.map((r) => r.demand), [rows])
  const T = demand.length

  const methods = useMemo(
    () =>
      [
        {
          id: 'naive' as const,
          label: 'Naive',
          color: COLOR_NAIVE,
          forecasts: naiveForecast(demand),
        },
        {
          id: 'ma' as const,
          label: `MA(${maN})`,
          color: COLOR_MA,
          forecasts: movingAverageForecast(demand, maN),
        },
        {
          id: 'es' as const,
          label: `ES(α = ${alpha.toFixed(2)})`,
          color: COLOR_ES,
          forecasts: expSmoothingForecast(demand, alpha),
        },
        {
          id: 'regression' as const,
          label: 'Linear regression',
          color: COLOR_REGRESSION,
          forecasts: regressionForecast(demand),
        },
      ].map((m) => {
        const work = errorRows(demand, m.forecasts)
        return { ...m, work, metrics: metricsFrom(work) }
      }),
    [demand, maN, alpha],
  )

  const enabledMethods = methods.filter((m) => enabled[m.id])

  const chartSeries: ChartSeries[] = showAnswers ? enabledMethods : []

  /** the lowest value per metric column, for bolding */
  const best = useMemo(() => {
    const pick = (get: (m: Metrics) => number | null) => {
      let min = Infinity
      for (const m of enabledMethods) {
        const v = m.metrics ? get(m.metrics) : null
        if (v !== null && v < min) min = v
      }
      return min
    }
    return {
      mad: pick((m) => m.mad),
      mse: pick((m) => m.mse),
      mape: pick((m) => m.mape),
    }
  }, [enabledMethods])

  // ── demand editing ──────────────────────────────────────
  const setDemand = (id: string, value: number) => {
    if (!Number.isFinite(value)) return
    setRows((list) =>
      list.map((r) =>
        r.id === id ? { ...r, demand: Math.max(0, Math.round(value)) } : r,
      ),
    )
  }
  const deleteRow = (id: string) => {
    setRows((list) =>
      list.length > MIN_PERIODS ? list.filter((r) => r.id !== id) : list,
    )
  }
  const addRow = () => {
    setRows((list) =>
      list.length < MAX_PERIODS
        ? [...list, { id: nextRowId(list), demand: list[list.length - 1]?.demand ?? 100 }]
        : list,
    )
  }

  // ── practice toolbar ────────────────────────────────────
  const isClassData =
    rows.length === CLASS_DEMAND.length &&
    CLASS_DEMAND.every((d, i) => rows[i].demand === d)

  const backToClass = () => {
    setRows(cloneClass())
  }
  const makeRandom = () => {
    setRows(randomDemand().map((d, i) => ({ id: `r${i + 1}`, demand: d })))
    setShowAnswers(false)
  }

  const toggleMethod = (id: MethodId) => {
    setEnabled((e) => ({ ...e, [id]: !e[id] }))
  }
  const toggleWork = (id: MethodId) => {
    setOpenWork((w) => ({ ...w, [id]: !w[id] }))
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DemoHeader label="Chapter 8 · Forecasting" title="Four Forecasts, Live">
        The demand series from class — edit it, overlay the four forecasting
        methods, and compare their accuracy with MAD, MSE, and MAPE. Or hide
        the answers and practice on a random problem.
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

      {/* Demand table editor — the data comes first */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-stone-900">The demand</h2>
          <p className="text-sm text-stone-600">
            Click a cell to edit — everything recomputes as you type.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full max-w-xs min-w-56 text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                <th className="w-20 py-2 pr-2 font-semibold">Period</th>
                <th className="w-32 py-2 pr-2 font-semibold">Demand</th>
                <th className="w-9 py-2" aria-label="Delete row" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-b border-stone-100 last:border-0">
                  <td className="py-1 pr-2 font-semibold text-stone-800 tabular-nums">
                    {i + 1}
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={r.demand}
                      onChange={(e) => setDemand(r.id, Number(e.target.value))}
                      aria-label={`Demand for period ${i + 1}`}
                      className={`${CELL_INPUT} tabular-nums`}
                    />
                  </td>
                  <td className="py-1">
                    <button
                      onClick={() => deleteRow(r.id)}
                      disabled={rows.length <= MIN_PERIODS}
                      title={
                        rows.length <= MIN_PERIODS
                          ? `Keep at least ${MIN_PERIODS} periods`
                          : `Delete period ${i + 1}`
                      }
                      aria-label={`Delete period ${i + 1}`}
                      className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-red-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-stone-400"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2">
          <button
            onClick={addRow}
            disabled={rows.length >= MAX_PERIODS}
            className="rounded-lg border border-dashed border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40"
          >
            + Add row
          </button>
        </div>
      </div>

      {/* The chart — the hero */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-2 text-lg font-semibold text-stone-900">
          The forecasts
        </h2>
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          {methods.map((m) => (
            <span key={m.id} className="flex items-center gap-1.5">
              <button
                onClick={() => toggleMethod(m.id)}
                aria-pressed={enabled[m.id]}
                className={
                  enabled[m.id]
                    ? 'flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50'
                    : 'flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-400 hover:bg-stone-50'
                }
              >
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={
                    enabled[m.id]
                      ? { backgroundColor: m.color }
                      : { border: '1.5px solid #a8a29e' }
                  }
                />
                {m.id === 'ma' ? `MA(${maN})` : m.id === 'es' ? 'ES(α)' : m.label}
              </button>
              {m.id === 'ma' && (
                <input
                  type="number"
                  min={MIN_MA_N}
                  max={MAX_MA_N}
                  value={maN}
                  disabled={!enabled.ma}
                  onChange={(e) => {
                    const v = Math.round(Number(e.target.value))
                    if (Number.isFinite(v))
                      setMaN(Math.min(MAX_MA_N, Math.max(MIN_MA_N, v)))
                  }}
                  aria-label="Moving-average window n"
                  className="w-14 rounded border border-stone-200 bg-white px-1.5 py-1 text-sm tabular-nums focus:border-garnet-400 focus:outline-none disabled:opacity-40"
                />
              )}
              {m.id === 'es' && (
                <span className="flex items-center gap-1.5">
                  <input
                    type="range"
                    min={MIN_ALPHA}
                    max={MAX_ALPHA}
                    step={0.05}
                    value={alpha}
                    disabled={!enabled.es}
                    onChange={(e) => setAlpha(Number(e.target.value))}
                    aria-label="Smoothing constant alpha"
                    className="w-24 accent-garnet-700 disabled:opacity-40"
                  />
                  <span className="w-16 text-sm text-stone-600 tabular-nums">
                    α = {alpha.toFixed(2)}
                  </span>
                </span>
              )}
            </span>
          ))}
        </div>
        <ForecastChart demand={demand} series={chartSeries} />
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
          <button
            onClick={() => void downloadWorksheet(demand, { alpha })}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Create worksheet (PDF)
          </button>
          <button
            onClick={() => void downloadWorksheet(demand, { alpha, solution: true })}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Create solutions (PDF)
          </button>
          <span className="text-xs text-stone-500">
            Both use this exact problem — Naive, MA(3), and ES(α ={' '}
            {alpha.toFixed(2)}) columns.
          </span>
        </div>
      </div>

      {/* Error metrics */}
      {showAnswers && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
          <h2 className="mb-1 text-lg font-semibold text-stone-900">
            Forecast accuracy
          </h2>
          <p className="mb-3 text-sm text-stone-600 tabular-nums">
            Eₜ = fₜ − dₜ · lower is better — the best in each column is bold.
          </p>
          {enabledMethods.length === 0 ? (
            <p className="py-4 text-center text-sm text-stone-500">
              No methods enabled — toggle one on above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-130 text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                    <th className="py-2 pr-3 font-semibold">Method</th>
                    <th className="py-2 pr-3 text-right font-semibold">
                      Next forecast (f<sub>{T + 1}</sub>)
                    </th>
                    <th className="py-2 pr-3 text-right font-semibold">MAD</th>
                    <th className="py-2 pr-3 text-right font-semibold">MSE</th>
                    <th className="py-2 pr-3 text-right font-semibold">MAPE</th>
                    <th className="w-32 py-2" aria-label="Show the work" />
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {enabledMethods.map((m) => {
                    const next = m.forecasts[T]
                    const mt = m.metrics
                    return (
                      <MetricRows
                        key={m.id}
                        label={m.label}
                        color={m.color}
                        next={next ?? null}
                        metrics={mt}
                        work={m.work}
                        best={best}
                        open={openWork[m.id]}
                        onToggle={() => toggleWork(m.id)}
                      />
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MetricRows({
  label,
  color,
  next,
  metrics,
  work,
  best,
  open,
  onToggle,
}: {
  label: string
  color: string
  next: number | null
  metrics: Metrics | null
  work: ErrorRow[]
  best: { mad: number; mse: number; mape: number }
  open: boolean
  onToggle: () => void
}) {
  const bold = (v: number | null, b: number) =>
    v !== null && Math.abs(v - b) < 1e-9
      ? 'font-bold text-stone-900'
      : 'text-stone-700'
  return (
    <>
      <tr className="border-b border-stone-100">
        <td className="py-1.5 pr-3">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="font-medium text-stone-800">{label}</span>
          </span>
        </td>
        <td className="py-1.5 pr-3 text-right text-stone-700">
          {next !== null ? fmt1(next) : '—'}
        </td>
        <td className={`py-1.5 pr-3 text-right ${bold(metrics?.mad ?? null, best.mad)}`}>
          {metrics ? fmt1(metrics.mad) : '—'}
        </td>
        <td className={`py-1.5 pr-3 text-right ${bold(metrics?.mse ?? null, best.mse)}`}>
          {metrics ? fmtInt(metrics.mse) : '—'}
        </td>
        <td
          className={`py-1.5 pr-3 text-right ${bold(metrics?.mape ?? null, best.mape)}`}
        >
          {metrics && metrics.mape !== null ? `${fmt1(metrics.mape)}%` : '—'}
        </td>
        <td className="py-1.5 text-right">
          {metrics ? (
            <button
              onClick={onToggle}
              aria-expanded={open}
              className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
            >
              {open ? 'Hide the work' : 'Show the work'}
            </button>
          ) : null}
        </td>
      </tr>
      {open && metrics && (
        <tr className="border-b border-stone-100">
          <td colSpan={6} className="py-3 pl-4">
            <table className="w-full max-w-xl min-w-100 text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                  <th className="py-1.5 pr-3 font-semibold">Period</th>
                  <th className="py-1.5 pr-3 text-right font-semibold">Forecast</th>
                  <th className="py-1.5 pr-3 text-right font-semibold">Demand</th>
                  <th className="py-1.5 pr-3 text-right font-semibold">|E|</th>
                  <th className="py-1.5 pr-3 text-right font-semibold">E²</th>
                  <th className="py-1.5 text-right font-semibold">|E| / d</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {work.map((r) => (
                  <tr key={r.period} className="border-b border-stone-100 last:border-0">
                    <td className="py-1 pr-3 text-stone-700">{r.period}</td>
                    <td className="py-1 pr-3 text-right text-stone-700">
                      {fmt1(r.forecast)}
                    </td>
                    <td className="py-1 pr-3 text-right text-stone-700">
                      {r.demand.toLocaleString('en-US')}
                    </td>
                    <td className="py-1 pr-3 text-right text-stone-700">
                      {fmt1(r.absError)}
                    </td>
                    <td className="py-1 pr-3 text-right text-stone-700">
                      {fmtInt(r.sqError)}
                    </td>
                    <td className="py-1 text-right text-stone-700">
                      {r.pctError !== null
                        ? `${Math.round(r.pctError * 100)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-stone-300 font-semibold text-stone-900">
                  <td className="py-1.5 pr-3" colSpan={3}>
                    Mean over {metrics.count} period{metrics.count === 1 ? '' : 's'}
                  </td>
                  <td className="py-1.5 pr-3 text-right">{fmt1(metrics.mad)}</td>
                  <td className="py-1.5 pr-3 text-right">{fmtInt(metrics.mse)}</td>
                  <td className="py-1.5 text-right">
                    {metrics.mape !== null ? `${fmt1(metrics.mape)}%` : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  )
}
