import { memo } from 'react'
import { violations, type Limits, type Subgroup } from '../../../lib/spc'

/** validated chart palette: series blue, limits garnet, reference stone */
const COLOR_SERIES = '#1d4ed8'
const COLOR_LIMIT = '#a52547'
const INK_SOFT = '#57534e'
const INK_MUTED = '#78716c'

const VW = 680
const VH = 210
const M = { top: 14, right: 86, bottom: 26, left: 50 }
const PLOT_W = VW - M.left - M.right
const PLOT_H = VH - M.top - M.bottom
/** fixed slot spacing until this many samples, then compress */
const SLOTS = 20

interface Pt {
  t: number
  v: number
  violating: boolean
}

/**
 * One control chart: the points in sample order, a solid center line, and
 * dashed control limits labeled with their values at the right edge.
 * Violating points are filled garnet only when `highlight` is on (the
 * verdict is an answer students practice making themselves).
 */
const Chart = memo(function Chart({
  title,
  pts,
  center,
  centerLabel,
  ucl,
  lcl,
  yMin,
  yMax,
  highlight,
  fmt,
}: {
  title: string
  pts: Pt[]
  center: number
  centerLabel: string
  ucl: number
  lcl: number
  yMin: number
  yMax: number
  highlight: boolean
  fmt: (v: number) => string
}) {
  const xPos = (t: number) =>
    M.left + ((t - 1) / Math.max(SLOTS - 1, pts.length - 1)) * PLOT_W
  const yPos = (v: number) =>
    M.top + PLOT_H - ((v - yMin) / (yMax - yMin)) * PLOT_H

  const line = (v: number, color: string, dash?: string) => (
    <line
      x1={M.left}
      y1={yPos(v)}
      x2={M.left + PLOT_W}
      y2={yPos(v)}
      stroke={color}
      strokeWidth="1.5"
      strokeDasharray={dash}
    />
  )
  const rightLabel = (v: number, text: string, color: string) => (
    <text
      x={M.left + PLOT_W + 6}
      y={yPos(v) + 3.5}
      fontSize="10.5"
      fontWeight="600"
      fill={color}
      className="tabular-nums"
    >
      {text}
    </text>
  )

  const xLabelEvery = pts.length > 24 ? 4 : pts.length > 12 ? 2 : 1

  return (
    <div>
      <div className="mb-0.5 text-sm font-semibold text-stone-800">{title}</div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full"
          style={{ minWidth: 560 }}
          role="img"
          aria-label={`${title} with center line and control limits`}
        >
          {line(ucl, COLOR_LIMIT, '5 4')}
          {line(lcl, COLOR_LIMIT, '5 4')}
          {line(center, INK_SOFT)}
          {rightLabel(ucl, `UCL = ${fmt(ucl)}`, COLOR_LIMIT)}
          {rightLabel(lcl, `LCL = ${fmt(lcl)}`, COLOR_LIMIT)}
          {rightLabel(center, `${centerLabel} = ${fmt(center)}`, INK_SOFT)}

          {/* x baseline and sample-number ticks */}
          <line
            x1={M.left}
            y1={M.top + PLOT_H}
            x2={M.left + PLOT_W}
            y2={M.top + PLOT_H}
            stroke={INK_MUTED}
            strokeWidth="1"
          />
          {pts.map((p) => (
            <g key={p.t}>
              <line
                x1={xPos(p.t)}
                y1={M.top + PLOT_H}
                x2={xPos(p.t)}
                y2={M.top + PLOT_H + 4}
                stroke={INK_MUTED}
                strokeWidth="1"
              />
              {(p.t % xLabelEvery === 0 || p.t === 1) && (
                <text
                  x={xPos(p.t)}
                  y={M.top + PLOT_H + 15}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill={INK_MUTED}
                  className="tabular-nums"
                >
                  {p.t}
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
            sample
          </text>

          {/* y-axis end labels */}
          {[yMin, yMax].map((v) => (
            <text
              key={v}
              x={M.left - 6}
              y={yPos(v) + 3.5}
              textAnchor="end"
              fontSize="10"
              fill={INK_MUTED}
              className="tabular-nums"
            >
              {fmt(v)}
            </text>
          ))}

          {/* the points, connected in sample order */}
          {pts.length > 1 && (
            <path
              d={pts
                .map((p, i) => `${i === 0 ? 'M' : 'L'}${xPos(p.t).toFixed(1)},${yPos(p.v).toFixed(1)}`)
                .join('')}
              fill="none"
              stroke={COLOR_SERIES}
              strokeWidth="1.6"
            />
          )}
          {pts.map((p) => {
            const bad = highlight && p.violating
            return (
              <g key={p.t}>
                <title>{`Sample ${p.t}: ${fmt(p.v)}`}</title>
                <circle
                  cx={xPos(p.t)}
                  cy={yPos(p.v)}
                  r={bad ? 4.2 : 3.2}
                  fill={bad ? COLOR_LIMIT : COLOR_SERIES}
                />
                <circle cx={xPos(p.t)} cy={yPos(p.v)} r="9" fill="transparent" />
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
})

/**
 * The X̄ chart and R chart for the boxed samples. The X̄ chart zooms to the
 * data (a fill level near 12 oz would vanish on a 0-based axis); the R
 * chart starts at 0.
 */
export const ControlCharts = memo(function ControlCharts({
  subgroups,
  lim,
  highlight,
}: {
  subgroups: Subgroup[]
  lim: Limits
  highlight: boolean
}) {
  const v = violations(subgroups, lim)
  const bad = (t: number, chart: 'mean' | 'range') =>
    v.some((x) => x.sample === t && x.chart === chart)

  const meanPts: Pt[] = subgroups.map((g, i) => ({
    t: i + 1,
    v: g.mean,
    violating: bad(i + 1, 'mean'),
  }))
  const rangePts: Pt[] = subgroups.map((g, i) => ({
    t: i + 1,
    v: g.range,
    violating: bad(i + 1, 'range'),
  }))

  const meanLo = Math.min(lim.lclX, ...meanPts.map((p) => p.v))
  const meanHi = Math.max(lim.uclX, ...meanPts.map((p) => p.v))
  const meanPad = Math.max((meanHi - meanLo) * 0.12, 0.01)
  const rangeHi = Math.max(lim.uclR, ...rangePts.map((p) => p.v))

  return (
    <div className="space-y-4">
      <Chart
        title="X̄ chart — sample means"
        pts={meanPts}
        center={lim.xbarbar}
        centerLabel="X̿"
        ucl={lim.uclX}
        lcl={lim.lclX}
        yMin={meanLo - meanPad}
        yMax={meanHi + meanPad}
        highlight={highlight}
        fmt={(x) => x.toFixed(2)}
      />
      <Chart
        title="R chart — sample ranges"
        pts={rangePts}
        center={lim.rbar}
        centerLabel="R̄"
        ucl={lim.uclR}
        lcl={lim.lclR}
        yMin={0}
        yMax={rangeHi * 1.12}
        highlight={highlight}
        fmt={(x) => x.toFixed(2)}
      />
    </div>
  )
})
