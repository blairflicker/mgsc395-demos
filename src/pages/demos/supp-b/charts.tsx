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
 * Share of time the system spent with exactly n customers, with the
 * theoretical geometric distribution P(n) = (1−ρ)ρⁿ as reference markers.
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
  const SHOWN = 14 // bars for n = 0..13, then a "14+" bucket
  const shares = stateShare.slice(0, SHOWN)
  shares.push(stateShare.slice(SHOWN).reduce((a, b) => a + b, 0))

  const theory =
    rho !== null && rho < 1
      ? [
          ...Array.from({ length: SHOWN }, (_, n) => (1 - rho) * Math.pow(rho, n)),
          Math.pow(rho, SHOWN),
        ]
      : null

  const yMax = Math.max(...shares, ...(theory ?? [0]), 0.05) * 1.1
  const slotW = PLOT_W / (SHOWN + 1)
  const barW = slotW - 2
  const xPos = (i: number) => M.left + i * slotW
  const yPos = (s: number) => M.top + PLOT_H - (s / yMax) * PLOT_H

  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-800">
        How many customers are in the system?
      </h3>
      <p className="mb-1 text-xs text-stone-500">
        Share of time with exactly n inside · theory: P(n) = (1−ρ)ρⁿ
      </p>
      <LegendRow color={COLOR_SYSTEM} theoryLabel="P(n) theory" theoryMarker="dot" />
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
          {shares.map((s, i) => {
            const h = M.top + PLOT_H - yPos(s)
            if (h <= 0) return null
            return (
              <rect
                key={i}
                x={xPos(i) + 1}
                y={yPos(s)}
                width={barW}
                height={h}
                rx={1.5}
                fill={COLOR_SYSTEM}
              >
                <title>
                  {`n = ${i === SHOWN ? '14+' : i}: ${(s * 100).toFixed(1)}% of the time`}
                </title>
              </rect>
            )
          })}
          {theory &&
            theory.map((p, i) => (
              <circle
                key={i}
                cx={xPos(i) + slotW / 2}
                cy={yPos(p)}
                r="3"
                fill="white"
                stroke={COLOR_THEORY}
                strokeWidth="1.8"
              >
                <title>{`theory P(${i === SHOWN ? '14+' : i}) = ${(p * 100).toFixed(1)}%`}</title>
              </circle>
            ))}
          {Array.from({ length: SHOWN + 1 }, (_, i) => i)
            .filter((i) => i % 2 === 0 || i === SHOWN)
            .map((i) => (
              <text
                key={i}
                x={xPos(i) + slotW / 2}
                y={M.top + PLOT_H + 16}
                textAnchor="middle"
                fontSize="10"
                fill={INK_MUTED}
              >
                {i === SHOWN ? '14+' : i}
              </text>
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
