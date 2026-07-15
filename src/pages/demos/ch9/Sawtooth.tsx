import { memo } from 'react'
import { dailyDemand, reorderPoint, type Scenario } from '../../../lib/eoq'
import { COLOR_INVENTORY, COLOR_ROP, INK_MUTED, INK_SOFT } from './palette'

const VW = 680
const VH = 260
const M = { top: 16, right: 18, bottom: 34, left: 56 }
const PLOT_W = VW - M.left - M.right
const PLOT_H = VH - M.top - M.bottom
const CYCLES_SHOWN = 3.5

/** smallest "nice" step (1/2/2.5/5 × 10^k) at least as big as `rough` */
function niceStep(rough: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(rough, 1e-9))))
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * pow >= rough) return m * pow
  }
  return 10 * pow
}

/**
 * Inventory over time at the chosen Q: start at Q, deplete at d per day,
 * replenish instantly to Q at each cycle boundary. An order is placed each
 * time inventory crosses the ROP line and arrives leadTime days later,
 * exactly as inventory hits zero.
 */
export const Sawtooth = memo(function Sawtooth({
  scenario,
  q,
}: {
  scenario: Scenario
  q: number
}) {
  const d = dailyDemand(scenario)
  const rop = reorderPoint(scenario)
  const cycle = q / d
  const totalDays = CYCLES_SHOWN * cycle

  const yMax = Math.max(q, rop) * 1.08
  const xPos = (day: number) => M.left + (day / totalDays) * PLOT_W
  const yPos = (v: number) => M.top + PLOT_H - (v / yMax) * PLOT_H

  // the sawtooth path, with instant vertical replenishments
  let path = `M${xPos(0).toFixed(1)},${yPos(q).toFixed(1)}`
  for (let k = 0; ; k++) {
    const end = (k + 1) * cycle
    if (end >= totalDays - 1e-9) {
      const inv = q - d * (totalDays - k * cycle)
      path += `L${xPos(totalDays).toFixed(1)},${yPos(inv).toFixed(1)}`
      break
    }
    path += `L${xPos(end).toFixed(1)},${yPos(0).toFixed(1)}`
    path += `L${xPos(end).toFixed(1)},${yPos(q).toFixed(1)}`
  }

  // orders are placed at inventory = ROP, leadTime days before each arrival
  const orderDays: number[] = []
  if (rop > 0 && rop < q) {
    for (let k = 0; ; k++) {
      const day = (k + 1) * cycle - scenario.leadTime
      if (day > totalDays) break
      if (day >= 0) orderDays.push(day)
    }
  }

  const yStep = niceStep(yMax / 4)
  const yTicks: number[] = []
  for (let v = yStep; v <= yMax; v += yStep) yTicks.push(v)
  const xStep = niceStep(totalDays / 6)
  const xTicks: number[] = []
  for (let v = xStep; v <= totalDays; v += xStep) xTicks.push(v)
  const fmtDay = (v: number) =>
    xStep >= 1 ? Math.round(v).toLocaleString('en-US') : v.toFixed(1)

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <svg width="22" height="10" aria-hidden>
            <line x1="0" y1="5" x2="22" y2="5" stroke={COLOR_INVENTORY} strokeWidth="2.5" />
          </svg>
          Inventory on hand
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="22" height="10" aria-hidden>
            <line x1="0" y1="5" x2="22" y2="5" stroke={COLOR_ROP} strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          Reorder point
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="10" height="10" aria-hidden>
            <circle cx="5" cy="5" r="3.5" fill="white" stroke={COLOR_ROP} strokeWidth="1.8" />
          </svg>
          Order placed
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full"
          style={{ minWidth: 560 }}
          role="img"
          aria-label="Inventory level over time at the chosen order quantity, with the reorder point marked"
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
                {v.toLocaleString('en-US')}
              </text>
            </g>
          ))}
          <text
            transform={`rotate(-90 12 ${M.top + PLOT_H / 2})`}
            x={12}
            y={M.top + PLOT_H / 2}
            textAnchor="middle"
            fontSize="10"
            fill={INK_MUTED}
          >
            units
          </text>

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
                {fmtDay(v)}
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
            days
          </text>

          {/* reorder point — dashed line with a right-edge label */}
          <line
            x1={M.left}
            y1={yPos(rop)}
            x2={M.left + PLOT_W}
            y2={yPos(rop)}
            stroke={COLOR_ROP}
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text
            x={M.left + PLOT_W - 4}
            y={yPos(rop) - 5}
            textAnchor="end"
            fontSize="10.5"
            fontWeight="600"
            fill={INK_SOFT}
            className="tabular-nums"
          >
            {`ROP = ${rop.toLocaleString('en-US', { maximumFractionDigits: 1 })}`}
          </text>

          {/* the inventory sawtooth */}
          <path d={path} fill="none" stroke={COLOR_INVENTORY} strokeWidth="2.5" />

          {/* order-placed markers where inventory crosses the ROP */}
          {orderDays.map((day) => (
            <g key={day}>
              <title>{`Order placed on day ${day.toLocaleString('en-US', { maximumFractionDigits: 1 })} — arrives ${scenario.leadTime} day${scenario.leadTime === 1 ? '' : 's'} later as inventory hits 0`}</title>
              <circle
                cx={xPos(day)}
                cy={yPos(rop)}
                r="4"
                fill="white"
                stroke={COLOR_ROP}
                strokeWidth="2"
              />
              <circle cx={xPos(day)} cy={yPos(rop)} r="10" fill="transparent" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
})
