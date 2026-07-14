import { memo } from 'react'
import { DURATION_BIN_COUNT, DURATION_BIN_WIDTH_MIN } from '../../../lib/mm1'

/** Validated chart palette (dataviz skill, light surface):
 *  observed-arrivals blue #1d4ed8, system garnet #a52547, service teal #0d9488,
 *  time-in-system amber #b45309 (distinct from service so students don't
 *  conflate W with 1/μ), theory reference = dashed neutral #57534e
 *  (direct-labeled, never color-alone).
 */
export const COLOR_LAMBDA = '#1d4ed8'
export const COLOR_SYSTEM = '#a52547'
export const COLOR_SERVICE = '#0d9488'
export const COLOR_W = '#b45309'
const COLOR_THEORY = '#57534e'
const INK_MUTED = '#78716c'
const GRID = '#e7e5e4'

const VW = 300
const VH = 168
const M = { top: 8, right: 12, bottom: 24, left: 10 }
const PLOT_W = VW - M.left - M.right
const PLOT_H = VH - M.top - M.bottom

function LegendRow({
  color,
  theoryLabel,
  theoryMarker = 'line',
}: {
  color: string
  theoryLabel: string
  theoryMarker?: 'line' | 'dot'
}) {
  return (
    <div className="mb-1 flex items-center gap-4 text-xs text-stone-500">
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: color }}
        />
        Observed
      </span>
      <span className="flex items-center gap-1.5">
        {theoryMarker === 'line' ? (
          <svg width="18" height="6" aria-hidden>
            <line
              x1="0"
              y1="3"
              x2="18"
              y2="3"
              stroke={COLOR_THEORY}
              strokeWidth="2"
              strokeDasharray="4 3"
            />
          </svg>
        ) : (
          <svg width="10" height="10" aria-hidden>
            <circle
              cx="5"
              cy="5"
              r="3"
              fill="white"
              stroke={COLOR_THEORY}
              strokeWidth="1.8"
            />
          </svg>
        )}
        {theoryLabel}
      </span>
    </div>
  )
}

export interface LSample {
  /** sim-hours */
  t: number
  /** customers in system at that instant */
  n: number
  /** running time-average L for the stats epoch, or null right after a dial change */
  lRun: number | null
}

/**
 * L over time: the instantaneous number in system (light trace), its
 * running time-average (bold), and the theoretical L as a dashed
 * reference. The x-axis always spans the full simulation history.
 */
export const LOverTimeChart = memo(function LOverTimeChart({
  history,
  theoryL,
  simT,
}: {
  history: LSample[]
  /** theoretical L for the current dials, or null when unstable */
  theoryL: number | null
  simT: number
}) {
  const vw = 640
  const vh = 180
  const m = { top: 10, right: 66, bottom: 22, left: 34 }
  const plotW = vw - m.left - m.right
  const plotH = vh - m.top - m.bottom

  const lastT = history.length > 0 ? history[history.length - 1].t : 0
  const tMax = Math.max(simT, lastT, 1 / 60)
  let nMax = 0
  for (const p of history) if (p.n > nMax) nMax = p.n
  const yMax = Math.max(nMax, theoryL ?? 0, 2) * 1.1

  const xPos = (t: number) => m.left + (t / tMax) * plotW
  const yPos = (v: number) => m.top + plotH - (v / yMax) * plotH

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('')

  const nPath = toPath(history.map((p) => ({ x: xPos(p.t), y: yPos(p.n) })))
  // the running average breaks at dial changes (lRun resets to null)
  const lRunSegments: string[] = []
  let seg: { x: number; y: number }[] = []
  for (const p of history) {
    if (p.lRun === null) {
      if (seg.length > 1) lRunSegments.push(toPath(seg))
      seg = []
    } else {
      seg.push({ x: xPos(p.t), y: yPos(Math.min(p.lRun, yMax)) })
    }
  }
  if (seg.length > 1) lRunSegments.push(toPath(seg))

  // x ticks: 4 round-ish time marks
  const xTicks = [0.25, 0.5, 0.75, 1].map((f) => f * tMax)
  const fmtT = (h: number) =>
    h < 1 ? `${Math.round(h * 60)}m` : `${Math.floor(h)}h${String(Math.round((h % 1) * 60)).padStart(2, '0')}`
  // y ticks: ~3 integer marks
  const yStep = Math.max(1, Math.ceil(yMax / 3))
  const yTicks: number[] = []
  for (let v = yStep; v < yMax; v += yStep) yTicks.push(v)

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden>
            <line x1="0" y1="3" x2="18" y2="3" stroke="#eda0af" strokeWidth="2" />
          </svg>
          In system now, n(t)
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden>
            <line x1="0" y1="3" x2="18" y2="3" stroke={COLOR_SYSTEM} strokeWidth="2.5" />
          </svg>
          Running average L (since last dial change)
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden>
            <line
              x1="0"
              y1="3"
              x2="18"
              y2="3"
              stroke={COLOR_THEORY}
              strokeWidth="2"
              strokeDasharray="4 3"
            />
          </svg>
          Theory L
        </span>
      </div>
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        className="w-full"
        role="img"
        aria-label="Number of customers in the system over time"
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={m.left}
              y1={yPos(v)}
              x2={m.left + plotW}
              y2={yPos(v)}
              stroke={GRID}
              strokeWidth="1"
            />
            <text
              x={m.left - 6}
              y={yPos(v) + 3}
              textAnchor="end"
              fontSize="10"
              fill={INK_MUTED}
            >
              {v}
            </text>
          </g>
        ))}
        <line
          x1={m.left}
          y1={m.top + plotH}
          x2={m.left + plotW}
          y2={m.top + plotH}
          stroke={GRID}
          strokeWidth="1"
        />
        {history.length > 1 && (
          <path d={nPath} fill="none" stroke="#eda0af" strokeWidth="1.5" />
        )}
        {lRunSegments.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={COLOR_SYSTEM} strokeWidth="2.5" />
        ))}
        {theoryL !== null && theoryL <= yMax && (
          <>
            <line
              x1={m.left}
              y1={yPos(theoryL)}
              x2={m.left + plotW}
              y2={yPos(theoryL)}
              stroke={COLOR_THEORY}
              strokeWidth="2"
              strokeDasharray="5 4"
            />
            <text
              x={m.left + plotW + 4}
              y={yPos(theoryL) + 3}
              fontSize="10"
              fill={INK_MUTED}
            >
              theory {theoryL.toFixed(2)}
            </text>
          </>
        )}
        {xTicks.map((t) => (
          <g key={t}>
            <line
              x1={xPos(t)}
              y1={m.top + plotH}
              x2={xPos(t)}
              y2={m.top + plotH + 4}
              stroke={INK_MUTED}
              strokeWidth="1"
            />
            <text
              x={xPos(t)}
              y={m.top + plotH + 16}
              textAnchor="middle"
              fontSize="10"
              fill={INK_MUTED}
            >
              {fmtT(t)}
            </text>
          </g>
        ))}
        {history.length < 3 && (
          <text
            x={m.left + plotW / 2}
            y={m.top + plotH / 2}
            textAnchor="middle"
            fontSize="11"
            fill={INK_MUTED}
          >
            collecting observations…
          </text>
        )}
      </svg>
    </div>
  )
})

/**
 * Histogram of observed durations (minutes) with the theoretical
 * exponential density overlaid as a dashed reference curve.
 */
export const DurationHistogram = memo(function DurationHistogram({
  bins,
  overflow = 0,
  ratePerHour,
  color,
  title,
  caption,
}: {
  bins: number[]
  /** observations beyond the axis range (≥ 15 min), shown as a note, not a bar */
  overflow?: number
  ratePerHour: number
  color: string
  title: string
  caption: string
}) {
  if (bins.length === 0) bins = new Array(DURATION_BIN_COUNT).fill(0)
  // overflow counts toward the total so in-range bars remain true densities
  // comparable to the pdf curve (whose integral over the axis is < 1)
  const total = bins.reduce((a, b) => a + b, 0) + overflow
  const xMaxMin = bins.length * DURATION_BIN_WIDTH_MIN
  const ratePerMin = ratePerHour / 60
  const densities = bins.map((c) =>
    total > 0 ? c / (total * DURATION_BIN_WIDTH_MIN) : 0,
  )
  const yMax = Math.max(ratePerMin, ...densities) * 1.08 || 1

  const xPos = (min: number) => M.left + (min / xMaxMin) * PLOT_W
  const yPos = (d: number) => M.top + PLOT_H - (d / yMax) * PLOT_H

  const barW = PLOT_W / bins.length - 2

  // theoretical exponential pdf: f(x) = r·e^(−r·x), x in minutes
  const curve = Array.from({ length: 61 }, (_, i) => {
    const x = (i / 60) * xMaxMin
    const y = ratePerMin * Math.exp(-ratePerMin * x)
    return `${i === 0 ? 'M' : 'L'}${xPos(x).toFixed(1)},${yPos(y).toFixed(1)}`
  }).join('')

  const xTicks = [0, 5, 10, 15]

  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
      <p className="mb-1 text-xs text-stone-500">{caption}</p>
      <LegendRow color={color} theoryLabel="Exponential curve" />
      <div className="relative">
        <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" role="img" aria-label={title}>
          {/* baseline */}
          <line
            x1={M.left}
            y1={M.top + PLOT_H}
            x2={M.left + PLOT_W}
            y2={M.top + PLOT_H}
            stroke={GRID}
            strokeWidth="1"
          />
          {densities.map((d, i) => {
            const x = xPos(i * DURATION_BIN_WIDTH_MIN) + 1
            const y = yPos(d)
            const h = M.top + PLOT_H - y
            if (h <= 0) return null
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={1.5}
                fill={color}
              >
                <title>
                  {`${(i * DURATION_BIN_WIDTH_MIN).toFixed(1)}–${((i + 1) * DURATION_BIN_WIDTH_MIN).toFixed(1)} min: ${bins[i]} observation${bins[i] === 1 ? '' : 's'}`}
                </title>
              </rect>
            )
          })}
          <path
            d={curve}
            fill="none"
            stroke={COLOR_THEORY}
            strokeWidth="2"
            strokeDasharray="5 4"
          />
          {xTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={xPos(tick)}
                y1={M.top + PLOT_H}
                x2={xPos(tick)}
                y2={M.top + PLOT_H + 4}
                stroke={INK_MUTED}
                strokeWidth="1"
              />
              <text
                x={xPos(tick)}
                y={M.top + PLOT_H + 16}
                textAnchor="middle"
                fontSize="10"
                fill={INK_MUTED}
              >
                {tick === xTicks[xTicks.length - 1] ? `${tick} min` : tick}
              </text>
            </g>
          ))}
          {overflow > 0 && (
            <text
              x={M.left + PLOT_W}
              y={M.top + 10}
              textAnchor="end"
              fontSize="10"
              fill={INK_MUTED}
            >
              +{overflow} obs ≥ {xMaxMin} min (off scale) →
            </text>
          )}
        </svg>
        {total < 8 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-white/85 px-3 py-1 text-xs text-stone-500">
              collecting observations…
            </span>
          </div>
        )}
      </div>
    </div>
  )
})

/**
 * Share of time the system spent with exactly n customers — drawn with
 * the same skinny-bar anatomy as the duration histograms (30 bars,
 * n = 0..29), with the theoretical P(n) = (1−ρ)ρⁿ as a dashed curve
 * that simply trails off; no lumped overflow bucket.
 */
export const StateDistribution = memo(function StateDistribution({
  stateShare,
  rho,
  simTime,
}: {
  stateShare: number[]
  /** theoretical utilization, or null when unstable */
  rho: number | null
  simTime: number
}) {
  const N_SHOWN = 30 // same bar count as the duration histograms
  const shares = Array.from({ length: N_SHOWN }, (_, n) => stateShare[n] ?? 0)

  const theoryAt =
    rho !== null && rho < 1 ? (x: number) => (1 - rho) * Math.pow(rho, x) : null

  const yMax = Math.max(...shares, theoryAt ? theoryAt(0) : 0, 0.05) * 1.08
  const slotW = PLOT_W / N_SHOWN
  const barW = slotW - 2
  const xPos = (n: number) => M.left + n * slotW
  const yPos = (s: number) => M.top + PLOT_H - (s / yMax) * PLOT_H

  const curve = theoryAt
    ? Array.from({ length: 61 }, (_, i) => {
        const x = (i / 60) * N_SHOWN
        return `${i === 0 ? 'M' : 'L'}${xPos(x).toFixed(1)},${yPos(theoryAt(x)).toFixed(1)}`
      }).join('')
    : null

  const xTicks = [0, 10, 20, 30]

  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-800">
        How many customers are in the system?
      </h3>
      <p className="mb-1 text-xs text-stone-500">
        Share of time with exactly n inside · theory: P(n) = (1−ρ)ρⁿ
      </p>
      <LegendRow color={COLOR_SYSTEM} theoryLabel="P(n) theory" />
      <div className="relative">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full"
          role="img"
          aria-label="Distribution of the number of customers in the system"
        >
          <line
            x1={M.left}
            y1={M.top + PLOT_H}
            x2={M.left + PLOT_W}
            y2={M.top + PLOT_H}
            stroke={GRID}
            strokeWidth="1"
          />
          {shares.map((s, n) => {
            const y = yPos(s)
            const h = M.top + PLOT_H - y
            if (h <= 0) return null
            return (
              <rect
                key={n}
                x={xPos(n) + 1}
                y={y}
                width={barW}
                height={h}
                rx={1.5}
                fill={COLOR_SYSTEM}
              >
                <title>{`n = ${n}: ${(s * 100).toFixed(1)}% of the time`}</title>
              </rect>
            )
          })}
          {curve && (
            <path
              d={curve}
              fill="none"
              stroke={COLOR_THEORY}
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          )}
          {xTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={xPos(tick)}
                y1={M.top + PLOT_H}
                x2={xPos(tick)}
                y2={M.top + PLOT_H + 4}
                stroke={INK_MUTED}
                strokeWidth="1"
              />
              <text
                x={xPos(tick)}
                y={M.top + PLOT_H + 16}
                textAnchor="middle"
                fontSize="10"
                fill={INK_MUTED}
              >
                {tick}
              </text>
            </g>
          ))}
        </svg>
        {simTime < 0.15 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-white/85 px-3 py-1 text-xs text-stone-500">
              collecting observations…
            </span>
          </div>
        )}
      </div>
    </div>
  )
})
