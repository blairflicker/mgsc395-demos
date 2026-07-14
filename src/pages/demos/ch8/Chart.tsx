import { memo } from 'react'
import {
  COLOR_ACTUAL,
  FUTURE_BAND,
  GRID,
  INK_MUTED,
  INK_SOFT,
} from './palette'

export interface ChartSeries {
  id: string
  label: string
  color: string
  /** forecasts[t−1] = f_t for t = 1..T+1; null where the method has none */
  forecasts: (number | null)[]
}

const VW = 680
const VH = 300
const M = { top: 14, right: 18, bottom: 30, left: 56 }
const PLOT_W = VW - M.left - M.right
const PLOT_H = VH - M.top - M.bottom

/** smallest "nice" step (1/2/2.5/5 × 10^k) at least as big as `rough` */
function niceStep(rough: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(rough, 1e-9))))
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * pow >= rough) return m * pow
  }
  return 10 * pow
}

const toPath = (pts: { x: number; y: number }[]) =>
  pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('')

/**
 * The hero chart: actual demand as a dark ink line with point markers,
 * each enabled method overlaid as its own colored line. Every method
 * extends one period past the data — the next-period forecast — drawn
 * as a dashed final segment ending in an open marker.
 */
export const ForecastChart = memo(function ForecastChart({
  demand,
  series,
}: {
  demand: number[]
  series: ChartSeries[]
}) {
  const T = demand.length
  const pMax = T + 1

  let top = Math.max(...demand, 1)
  for (const s of series) {
    for (const f of s.forecasts) if (f !== null && f > top) top = f
  }
  const yMax = top * 1.08

  const xPos = (p: number) => M.left + ((p - 1) / (pMax - 1)) * PLOT_W
  const yPos = (v: number) => M.top + PLOT_H - (v / yMax) * PLOT_H

  const yStep = niceStep(yMax / 4)
  const yTicks: number[] = []
  for (let v = yStep; v <= yMax; v += yStep) yTicks.push(v)
  const xLabelEvery = pMax > 16 ? 2 : 1

  const actualPts = demand.map((d, i) => ({ x: xPos(i + 1), y: yPos(d) }))

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <svg width="22" height="10" aria-hidden>
            <line x1="0" y1="5" x2="22" y2="5" stroke={COLOR_ACTUAL} strokeWidth="2.5" />
            <circle cx="11" cy="5" r="3" fill={COLOR_ACTUAL} />
          </svg>
          Actual demand
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="28" height="10" aria-hidden>
            <line
              x1="0"
              y1="5"
              x2="19"
              y2="5"
              stroke={INK_SOFT}
              strokeWidth="2"
              strokeDasharray="4 3"
            />
            <circle cx="23.5" cy="5" r="3.5" fill="white" stroke={INK_SOFT} strokeWidth="1.8" />
          </svg>
          Next-period forecast
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full"
          style={{ minWidth: 560 }}
          role="img"
          aria-label="Actual demand by period with each enabled forecasting method overlaid"
        >
          {/* the one period past the data */}
          <rect
            x={xPos(T)}
            y={M.top}
            width={xPos(pMax) - xPos(T)}
            height={PLOT_H}
            fill={FUTURE_BAND}
          />

          {/* y gridlines */}
          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={M.left}
                y1={yPos(v)}
                x2={M.left + PLOT_W}
                y2={yPos(v)}
                stroke={GRID}
                strokeWidth="1"
              />
              <text
                x={M.left - 8}
                y={yPos(v) + 3.5}
                textAnchor="end"
                fontSize="10.5"
                fill={INK_MUTED}
                className="tabular-nums"
              >
                {v.toLocaleString('en-US')}
              </text>
            </g>
          ))}

          {/* baseline (y = 0) and x ticks */}
          <line
            x1={M.left}
            y1={M.top + PLOT_H}
            x2={M.left + PLOT_W}
            y2={M.top + PLOT_H}
            stroke={INK_MUTED}
            strokeWidth="1"
          />
          <text
            x={M.left - 8}
            y={M.top + PLOT_H + 3.5}
            textAnchor="end"
            fontSize="10.5"
            fill={INK_MUTED}
            className="tabular-nums"
          >
            0
          </text>
          {Array.from({ length: pMax }, (_, i) => i + 1).map((p) => (
            <g key={p}>
              <line
                x1={xPos(p)}
                y1={M.top + PLOT_H}
                x2={xPos(p)}
                y2={M.top + PLOT_H + 4}
                stroke={INK_MUTED}
                strokeWidth="1"
              />
              {(p % xLabelEvery === 0 || p === 1 || p === pMax) && (
                <text
                  x={xPos(p)}
                  y={M.top + PLOT_H + 17}
                  textAnchor="middle"
                  fontSize="10.5"
                  fill={INK_MUTED}
                  className="tabular-nums"
                >
                  {p}
                </text>
              )}
            </g>
          ))}
          <text
            x={M.left + PLOT_W / 2}
            y={VH - 2}
            textAnchor="middle"
            fontSize="10"
            fill={INK_MUTED}
          >
            period
          </text>

          {/* forecast series */}
          {series.map((s) => {
            const pts: { t: number; x: number; y: number; v: number }[] = []
            for (let t = 1; t <= pMax; t++) {
              const f = s.forecasts[t - 1]
              if (f === null || f === undefined) continue
              pts.push({ t, x: xPos(t), y: yPos(f), v: f })
            }
            const solid = pts.filter((p) => p.t <= T)
            const atT = pts.find((p) => p.t === T)
            const atNext = pts.find((p) => p.t === pMax)
            return (
              <g key={s.id}>
                {solid.length > 1 && (
                  <path d={toPath(solid)} fill="none" stroke={s.color} strokeWidth="2" />
                )}
                {atT && atNext && (
                  <line
                    x1={atT.x}
                    y1={atT.y}
                    x2={atNext.x}
                    y2={atNext.y}
                    stroke={s.color}
                    strokeWidth="2"
                    strokeDasharray="5 4"
                  />
                )}
                {solid.map((p) => (
                  <g key={p.t}>
                    <title>{`${s.label} — forecast for period ${p.t}: ${p.v.toFixed(1)}`}</title>
                    <circle cx={p.x} cy={p.y} r="2.4" fill={s.color} />
                    <circle cx={p.x} cy={p.y} r="9" fill="transparent" />
                  </g>
                ))}
                {atNext && (
                  <g>
                    <title>{`${s.label} — next-period forecast (period ${pMax}): ${atNext.v.toFixed(1)}`}</title>
                    <circle
                      cx={atNext.x}
                      cy={atNext.y}
                      r="4"
                      fill="white"
                      stroke={s.color}
                      strokeWidth="2"
                    />
                    <circle cx={atNext.x} cy={atNext.y} r="10" fill="transparent" />
                  </g>
                )}
              </g>
            )
          })}

          {/* actual demand on top */}
          {actualPts.length > 1 && (
            <path d={toPath(actualPts)} fill="none" stroke={COLOR_ACTUAL} strokeWidth="2.5" />
          )}
          {demand.map((d, i) => (
            <g key={i}>
              <title>{`Period ${i + 1} — demand ${d.toLocaleString('en-US')}`}</title>
              <circle cx={xPos(i + 1)} cy={yPos(d)} r="3" fill={COLOR_ACTUAL} />
              <circle cx={xPos(i + 1)} cy={yPos(d)} r="9" fill="transparent" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
})
