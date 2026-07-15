import { memo, useRef } from 'react'
import {
  holdingCost,
  orderingCost,
  qStar,
  totalCost,
  type Scenario,
} from '../../../lib/eoq'
import {
  COLOR_HOLDING,
  COLOR_ORDERING,
  COLOR_TOTAL,
  INK_MUTED,
  INK_SOFT,
} from './palette'

const VW = 680
const VH = 300
const M = { top: 16, right: 18, bottom: 34, left: 64 }
const PLOT_W = VW - M.left - M.right
const PLOT_H = VH - M.top - M.bottom
const SAMPLES = 140

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

const moneyTick = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`

/**
 * Ordering, holding, and total annual cost as Q varies, with the student's
 * chosen Q as a grabbable dashed line (drag it, or use arrow keys, to move
 * in steps of 5) and — when answers are shown — a marker at Q* on the
 * total-cost minimum.
 */
export const CostChart = memo(function CostChart({
  scenario,
  q,
  qMin,
  qMax,
  showQStar,
  onQChange,
}: {
  scenario: Scenario
  q: number
  qMin: number
  qMax: number
  showQStar: boolean
  onQChange: (q: number) => void
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
    const raw = qMin + frac * (qMax - qMin)
    return Math.min(qMax, Math.max(qMin, Math.round(raw / 5) * 5))
  }
  const series = [
    { id: 'ordering', label: 'Ordering cost', color: COLOR_ORDERING, at: (v: number) => orderingCost(scenario, v) },
    { id: 'holding', label: 'Holding cost', color: COLOR_HOLDING, at: (v: number) => holdingCost(scenario, v) },
    { id: 'total', label: 'Total cost', color: COLOR_TOTAL, at: (v: number) => totalCost(scenario, v) },
  ]

  let top = 1
  const sampled = series.map((s) => {
    const pts: { q: number; v: number }[] = []
    for (let i = 0; i <= SAMPLES; i++) {
      const qq = qMin + (i / SAMPLES) * (qMax - qMin)
      const v = s.at(qq)
      if (v > top) top = v
      pts.push({ q: qq, v })
    }
    return { ...s, pts }
  })
  const yMax = top * 1.06

  const xPos = (qq: number) => M.left + ((qq - qMin) / (qMax - qMin)) * PLOT_W
  const yPos = (v: number) => M.top + PLOT_H - (v / yMax) * PLOT_H

  const yStep = niceStep(yMax / 4)
  const yTicks: number[] = []
  for (let v = yStep; v <= yMax; v += yStep) yTicks.push(v)
  const xStep = niceStep((qMax - qMin) / 6)
  const xTicks: number[] = []
  for (let v = Math.ceil(qMin / xStep) * xStep; v <= qMax; v += xStep) xTicks.push(v)

  const qc = Math.min(qMax, Math.max(qMin, q))
  const tcAtQ = totalCost(scenario, qc)
  const qs = qStar(scenario)
  const tcAtStar = totalCost(scenario, qs)
  const starVisible = showQStar && qs >= qMin && qs <= qMax

  const qLabelEnd = xPos(qc) > M.left + PLOT_W - 90
  const starX = Math.min(M.left + PLOT_W - 40, Math.max(M.left + 40, xPos(qs)))

  // the label box that rides along with the grabbable line
  const BOX_W = 116
  const BOX_H = 32
  const lineX = xPos(qc)
  const boxX = lineX + 8 + BOX_W > M.left + PLOT_W ? lineX - 8 - BOX_W : lineX + 8
  const boxY = M.top + 2

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-stone-500">
        {series.map((s) => (
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
          Your Q
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full"
          style={{ minWidth: 560 }}
          role="img"
          aria-label="Annual ordering, holding, and total cost as the order quantity varies"
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
            order quantity Q
          </text>

          {/* the cost curves */}
          {sampled.map((s) => (
            <path
              key={s.id}
              d={toPath(s.pts.map((p) => ({ x: xPos(p.q), y: yPos(p.v) })))}
              fill="none"
              stroke={s.color}
              strokeWidth={s.id === 'total' ? 2.5 : 2}
            />
          ))}

          {/* Q* on the total-cost minimum — only when answers are shown */}
          {starVisible && (
            <g>
              <title>{`Q* = ${Math.round(qs).toLocaleString('en-US')} — total cost ${moneyTick(tcAtStar)}`}</title>
              <circle
                cx={xPos(qs)}
                cy={yPos(tcAtStar)}
                r="4.5"
                fill="white"
                stroke={COLOR_TOTAL}
                strokeWidth="2"
              />
              <text
                x={starX}
                y={Math.min(M.top + PLOT_H - 6, yPos(tcAtStar) + 20)}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill={INK_SOFT}
                className="tabular-nums"
              >
                {`Q* = ${Math.round(qs).toLocaleString('en-US')}`}
              </text>
            </g>
          )}

          {/* chosen Q on the total-cost curve, labeled with its total */}
          <g>
            <title>{`Q = ${Math.round(qc).toLocaleString('en-US')} — total cost ${moneyTick(tcAtQ)}`}</title>
            <circle
              cx={xPos(qc)}
              cy={yPos(tcAtQ)}
              r="4"
              fill="white"
              stroke={INK_SOFT}
              strokeWidth="2"
            />
            <text
              x={qLabelEnd ? xPos(qc) - 9 : xPos(qc) + 9}
              y={Math.max(M.top + 10, yPos(tcAtQ) - 9)}
              textAnchor={qLabelEnd ? 'end' : 'start'}
              fontSize="11"
              fontWeight="600"
              fill={INK_SOFT}
              className="tabular-nums"
            >
              {moneyTick(tcAtQ)}
            </text>
          </g>

          {/* the grabbable chosen-Q line with its sliding label box */}
          <g
            role="slider"
            aria-label="Your order quantity"
            aria-valuemin={qMin}
            aria-valuemax={qMax}
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
                onQChange(Math.max(qMin, qc - 5))
              } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault()
                onQChange(Math.min(qMax, qc + 5))
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
              YOUR ORDER QUANTITY
            </text>
            <text
              x={boxX + 8}
              y={boxY + 26}
              fontSize="12"
              fontWeight="600"
              fill="#292524"
              className="tabular-nums"
            >
              {`${Math.round(qc).toLocaleString('en-US')} units`}
            </text>
          </g>
        </svg>
      </div>
    </div>
  )
})
