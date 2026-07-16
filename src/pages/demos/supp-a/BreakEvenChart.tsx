import { memo, useRef } from 'react'
import { INK_MUTED, INK_SOFT } from './palette'

const VW = 680
const VH = 300
const M = { top: 16, right: 18, bottom: 34, left: 64 }
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

const moneyTick = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`

const money = (v: number) => {
  const r = Math.round(v * 100) / 100
  return Number.isInteger(r)
    ? `$${r.toLocaleString('en-US')}`
    : `$${r.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export interface ChartLine {
  id: string
  label: string
  color: string
  at: (q: number) => number
}

/**
 * Two straight cost/revenue lines over volume Q, with the student's chosen
 * volume as a grabbable dashed line (drag it, or use arrow keys, to move in
 * snap steps): open markers where it crosses each line, a $ gap readout
 * between them, and — when answers are shown — a marker at the crossing.
 */
export const BreakEvenChart = memo(function BreakEvenChart({
  lines,
  xMax,
  step,
  unit,
  yourLabel,
  q,
  onQChange,
  crossingQ,
  crossingLabel,
  showCrossing,
  ariaLabel,
}: {
  lines: [ChartLine, ChartLine]
  xMax: number
  step: number
  /** unit word for the riding label box, e.g. "patients" */
  unit: string
  /** small-caps title of the riding label box, e.g. "YOUR VOLUME" */
  yourLabel: string
  q: number
  onQChange: (q: number) => void
  crossingQ: number
  /** SVG text content for the crossing label (tspans allowed) */
  crossingLabel: React.ReactNode
  showCrossing: boolean
  ariaLabel: string
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)

  const qFromClientX = (clientX: number): number | null => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    if (rect.width === 0) return null
    const x = ((clientX - rect.left) / rect.width) * VW
    const frac = Math.min(1, Math.max(0, (x - M.left) / PLOT_W))
    const raw = frac * xMax
    return Math.min(xMax, Math.max(0, Math.round(raw / step) * step))
  }

  const top = Math.max(lines[0].at(0), lines[1].at(0), lines[0].at(xMax), lines[1].at(xMax), 1)
  const yMax = top * 1.06

  const xPos = (qq: number) => M.left + (qq / xMax) * PLOT_W
  const yPos = (v: number) => M.top + PLOT_H - (v / yMax) * PLOT_H

  const yStep = niceStep(yMax / 4)
  const yTicks: number[] = []
  for (let v = yStep; v <= yMax; v += yStep) yTicks.push(v)
  const xStep = niceStep(xMax / 6)
  const xTicks: number[] = []
  for (let v = xStep; v <= xMax; v += xStep) xTicks.push(v)

  const qc = Math.min(xMax, Math.max(0, q))

  const vCross = lines[0].at(crossingQ)
  const crossVisible = showCrossing && crossingQ >= 0 && crossingQ <= xMax
  const crossX = Math.min(M.left + PLOT_W - 44, Math.max(M.left + 44, xPos(crossingQ)))

  const lineX = xPos(qc)

  // per-line call-out labels at the chosen Q: each line's value in a small box
  // beside the dashed line, nudged apart vertically when the two lines nearly
  // meet (near the crossing) so the numbers never sit on top of each other
  const LBL_W = 78
  const LBL_H = 20
  const LBL_GAP = 10
  const boxSide = lineX > M.left + PLOT_W - (LBL_W + 24) ? -1 : 1
  const labels = lines.map((s) => {
    const value = s.at(qc)
    const dotY = yPos(value)
    return { color: s.color, value, dotY, y: dotY }
  })
  {
    const [hi, lo] =
      labels[0].y <= labels[1].y ? [labels[0], labels[1]] : [labels[1], labels[0]]
    const minSep = LBL_H + 6
    if (lo.y - hi.y < minSep) {
      const mid = (hi.y + lo.y) / 2
      hi.y = mid - minSep / 2
      lo.y = mid + minSep / 2
    }
    for (const l of labels) {
      l.y = Math.min(M.top + PLOT_H - LBL_H / 2, Math.max(M.top + LBL_H / 2, l.y))
    }
  }

  // the label box that rides along with the grabbable line
  const BOX_W = 116
  const BOX_H = 32
  const boxX = lineX + 8 + BOX_W > M.left + PLOT_W ? lineX - 8 - BOX_W : lineX + 8
  const boxY = M.top + 2

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-stone-500">
        {lines.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5">
            <svg width="22" height="10" aria-hidden>
              <line x1="0" y1="5" x2="22" y2="5" stroke={s.color} strokeWidth="2.5" />
            </svg>
            {s.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <svg width="22" height="10" aria-hidden>
            <line x1="0" y1="5" x2="22" y2="5" stroke={INK_SOFT} strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          Your volume
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full"
          style={{ minWidth: 560 }}
          role="img"
          aria-label={ariaLabel}
        >
          {/* y-axis labels with small ticks */}
          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={M.left - 4}
                y1={yPos(v)}
                x2={M.left}
                y2={yPos(v)}
                stroke={INK_MUTED}
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
                {moneyTick(v)}
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
            $0
          </text>
          {xTicks.map((v) => (
            <g key={v}>
              <line
                x1={xPos(v)}
                y1={M.top + PLOT_H}
                x2={xPos(v)}
                y2={M.top + PLOT_H + 4}
                stroke={INK_MUTED}
                strokeWidth="1"
              />
              <text
                x={xPos(v)}
                y={M.top + PLOT_H + 17}
                textAnchor="middle"
                fontSize="10.5"
                fill={INK_MUTED}
                className="tabular-nums"
              >
                {v.toLocaleString('en-US')}
              </text>
            </g>
          ))}
          <text
            x={M.left + PLOT_W / 2}
            y={VH - 2}
            textAnchor="middle"
            fontSize="10"
            fill={INK_MUTED}
          >
            {`volume Q (${unit})`}
          </text>

          {/* the two straight lines */}
          {lines.map((s) => (
            <line
              key={s.id}
              x1={xPos(0)}
              y1={yPos(s.at(0))}
              x2={xPos(xMax)}
              y2={yPos(s.at(xMax))}
              stroke={s.color}
              strokeWidth="2.5"
            />
          ))}

          {/* the crossing — only when answers are shown */}
          {crossVisible && (
            <g>
              <title>{`Crossing at Q = ${crossingQ.toLocaleString('en-US', { maximumFractionDigits: 1 })} ${unit} — both lines at ${moneyTick(vCross)}`}</title>
              <circle
                cx={xPos(crossingQ)}
                cy={yPos(vCross)}
                r="4.5"
                fill="white"
                stroke={INK_SOFT}
                strokeWidth="2"
              />
              <text
                x={crossX}
                y={Math.min(M.top + PLOT_H - 6, yPos(vCross) + 20)}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill={INK_SOFT}
                className="tabular-nums"
              >
                {crossingLabel}
              </text>
            </g>
          )}

          {/* the grabbable chosen-Q line with its sliding label box */}
          <g
            role="slider"
            aria-label={`Your volume in ${unit}`}
            aria-valuemin={0}
            aria-valuemax={xMax}
            aria-valuenow={Math.round(qc)}
            tabIndex={0}
            onPointerDown={(e) => {
              const v = qFromClientX(e.clientX)
              if (v === null) return
              dragging.current = true
              try {
                e.currentTarget.setPointerCapture(e.pointerId)
              } catch {
                /* no active pointer (synthetic event) — dragging still works */
              }
              onQChange(v)
            }}
            onPointerMove={(e) => {
              if (!dragging.current) return
              const v = qFromClientX(e.clientX)
              if (v !== null) onQChange(v)
            }}
            onPointerUp={(e) => {
              dragging.current = false
              try {
                e.currentTarget.releasePointerCapture(e.pointerId)
              } catch {
                /* capture may not exist — nothing to release */
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault()
                onQChange(Math.max(0, qc - step))
              } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault()
                onQChange(Math.min(xMax, qc + step))
              }
            }}
            style={{ cursor: 'ew-resize', touchAction: 'none', outline: 'none' }}
          >
            <rect
              x={lineX - 16}
              y={M.top}
              width={32}
              height={PLOT_H}
              fill="transparent"
            />
            <line
              x1={lineX}
              y1={M.top}
              x2={lineX}
              y2={M.top + PLOT_H}
              stroke={INK_SOFT}
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />

            {/* each line's value at the chosen Q, in a call-out box beside the
                dashed line, with an open marker on the line itself */}
            {labels.map((l, i) => {
              const boxX = boxSide === 1 ? lineX + LBL_GAP : lineX - LBL_GAP - LBL_W
              const connectX = boxSide === 1 ? boxX : boxX + LBL_W
              return (
                <g key={lines[i].id}>
                  <title>{`${lines[i].label} at Q = ${Math.round(qc).toLocaleString('en-US')}: ${money(l.value)}`}</title>
                  <line
                    x1={lineX}
                    y1={l.dotY}
                    x2={connectX}
                    y2={l.y}
                    stroke={l.color}
                    strokeWidth="1"
                  />
                  <circle
                    cx={lineX}
                    cy={l.dotY}
                    r="4"
                    fill="white"
                    stroke={l.color}
                    strokeWidth="2"
                  />
                  <rect
                    x={boxX}
                    y={l.y - LBL_H / 2}
                    width={LBL_W}
                    height={LBL_H}
                    rx="5"
                    fill="white"
                    stroke={l.color}
                    strokeWidth="1.5"
                  />
                  <text
                    x={boxX + LBL_W / 2}
                    y={l.y + 4}
                    textAnchor="middle"
                    fontSize="11.5"
                    fontWeight="600"
                    fill="#292524"
                    className="tabular-nums"
                  >
                    {money(l.value)}
                  </text>
                </g>
              )
            })}

            <rect
              x={boxX}
              y={boxY}
              width={BOX_W}
              height={BOX_H}
              rx="6"
              fill="white"
              stroke="#d6d3d1"
            />
            <text x={boxX + 8} y={boxY + 12} fontSize="8.5" fill={INK_MUTED}>
              {yourLabel}
            </text>
            <text
              x={boxX + 8}
              y={boxY + 26}
              fontSize="12"
              fontWeight="600"
              fill="#292524"
              className="tabular-nums"
            >
              {`${Math.round(qc).toLocaleString('en-US')} ${unit}`}
            </text>
          </g>
        </svg>
      </div>
    </div>
  )
})
