import { memo } from 'react'
import { paretoRows, totalCount, type Category } from '../../../lib/pareto'

/** validated chart palette — blue bars, teal for bars marked to fix,
 *  garnet for the cumulative-percent line, stone ink for text */
const COLOR_BAR = '#1d4ed8'
const COLOR_FIXED = '#0d9488'
const COLOR_CUMULATIVE = '#a52547'
const INK = '#1c1917'
const INK_MUTED = '#78716c'

const VW = 680
const VH = 300
const M = { top: 22, right: 48, bottom: 32, left: 44 }
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

/** truncate a category name so it fits under its bar */
function fitLabel(name: string, band: number, fontSize: number): string {
  const maxChars = Math.max(4, Math.floor(band / (fontSize * 0.54)))
  return name.length <= maxChars ? name : `${name.slice(0, maxChars - 1)}…`
}

export type ChartMode = 'collected' | 'sorted'

/**
 * The tally as bars — in collected order, or re-sorted with the
 * cumulative-percent line overlaid. Clicking a bar marks that category
 * as one you would fix.
 */
export const ParetoChart = memo(function ParetoChart({
  categories,
  mode,
  fixedIds,
  onToggle,
  unit,
}: {
  categories: Category[]
  mode: ChartMode
  fixedIds: ReadonlySet<string>
  onToggle: (id: string) => void
  unit: string
}) {
  const total = totalCount(categories)
  const rows = paretoRows(categories)
  const display =
    mode === 'sorted'
      ? rows
      : categories.map((c) => rows.find((r) => r.category.id === c.id)!)

  const top = Math.max(...display.map((r) => r.category.count), 1)
  const yMax = top * 1.08
  const yStep = niceStep(yMax / 4)
  const yTicks: number[] = []
  for (let v = yStep; v <= yMax; v += yStep) yTicks.push(v)

  const yPos = (v: number) => M.top + PLOT_H - (v / yMax) * PLOT_H
  const yPct = (pct: number) => M.top + PLOT_H - (pct / 100) * PLOT_H

  const n = display.length
  const band = PLOT_W / n
  const barW = band * 0.62
  const xCenter = (i: number) => M.left + i * band + band / 2

  const labelFont = n > 5 ? 9 : 10
  const cumPts = rows.map((r, i) => ({
    x: xCenter(i),
    y: yPct(r.cumulativePercent * 100),
    row: r,
  }))

  return (
    <div>
      {/* legend */}
      <div className="mb-1 flex min-h-5 flex-wrap items-center gap-x-5 gap-y-1 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-4 rounded-sm"
            style={{ backgroundColor: COLOR_BAR }}
          />
          {unit}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-4 rounded-sm"
            style={{ backgroundColor: COLOR_FIXED }}
          />
          marked to fix
        </span>
        {mode === 'sorted' && (
          <span className="flex items-center gap-1.5">
            <svg width="22" height="10" aria-hidden>
              <line
                x1="0"
                y1="5"
                x2="22"
                y2="5"
                stroke={COLOR_CUMULATIVE}
                strokeWidth="2"
              />
              <circle cx="11" cy="5" r="3" fill={COLOR_CUMULATIVE} />
            </svg>
            cumulative %
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full"
          style={{ minWidth: 560 }}
          role="img"
          aria-label={`Bar chart of ${unit} by category${mode === 'sorted' ? ', sorted largest first with the cumulative percent line' : ' in the order collected'}`}
        >
          {/* left axis — counts, from 0 */}
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
            x={M.left - 8}
            y={M.top + PLOT_H + 3.5}
            textAnchor="end"
            fontSize="10.5"
            fill={INK_MUTED}
            className="tabular-nums"
          >
            0
          </text>
          <line
            x1={M.left}
            y1={M.top + PLOT_H}
            x2={M.left + PLOT_W}
            y2={M.top + PLOT_H}
            stroke={INK_MUTED}
            strokeWidth="1"
          />

          {/* right axis — cumulative percent, sorted view only */}
          {mode === 'sorted' && (
            <g>
              {[0, 25, 50, 75, 100].map((pct) => (
                <g key={pct}>
                  <line
                    x1={M.left + PLOT_W}
                    y1={yPct(pct)}
                    x2={M.left + PLOT_W + 4}
                    y2={yPct(pct)}
                    stroke={INK_MUTED}
                    strokeWidth="1"
                  />
                  <text
                    x={M.left + PLOT_W + 7}
                    y={yPct(pct) + 3.5}
                    textAnchor="start"
                    fontSize="10.5"
                    fill={INK_MUTED}
                    className="tabular-nums"
                  >
                    {pct}%
                  </text>
                </g>
              ))}
              <line
                x1={M.left + PLOT_W}
                y1={M.top}
                x2={M.left + PLOT_W}
                y2={M.top + PLOT_H}
                stroke={INK_MUTED}
                strokeWidth="1"
              />
            </g>
          )}

          {/* bars — click to mark a category as fixed */}
          {display.map((r, i) => {
            const fixed = fixedIds.has(r.category.id)
            const h = (r.category.count / yMax) * PLOT_H
            return (
              <g
                key={r.category.id}
                onClick={() => onToggle(r.category.id)}
                className="cursor-pointer"
              >
                <title>{`${r.category.name} — ${r.category.count} ${unit} (${(r.percent * 100).toFixed(1)}%)${fixed ? ' · marked to fix' : ''}`}</title>
                <rect
                  x={xCenter(i) - band / 2 + 1}
                  y={M.top}
                  width={band - 2}
                  height={PLOT_H}
                  fill="transparent"
                />
                <rect
                  x={xCenter(i) - barW / 2}
                  y={M.top + PLOT_H - h}
                  width={barW}
                  height={h}
                  fill={fixed ? COLOR_FIXED : COLOR_BAR}
                  stroke={fixed ? INK : 'none'}
                  strokeWidth={fixed ? 1.75 : 0}
                />
                {mode === 'sorted' && (
                  <text
                    x={xCenter(i)}
                    y={M.top + PLOT_H - h - 5}
                    textAnchor="middle"
                    fontSize="10"
                    fill={INK}
                    className="tabular-nums"
                  >
                    {(r.percent * 100).toFixed(1)}%
                  </text>
                )}
                <text
                  x={xCenter(i)}
                  y={M.top + PLOT_H + 15}
                  textAnchor="middle"
                  fontSize={labelFont}
                  fill={INK_MUTED}
                >
                  {fitLabel(r.category.name, band, labelFont)}
                </text>
              </g>
            )
          })}

          {/* cumulative-percent line, sorted view only */}
          {mode === 'sorted' && (
            <g>
              <path
                d={cumPts
                  .map(
                    (p, i) =>
                      `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`,
                  )
                  .join('')}
                fill="none"
                stroke={COLOR_CUMULATIVE}
                strokeWidth="2"
              />
              {cumPts.map((p) => (
                <g key={p.row.category.id}>
                  <title>{`Cumulative through ${p.row.category.name}: ${p.row.cumulativeCount} of ${total} ${unit} (${(p.row.cumulativePercent * 100).toFixed(1)}%)`}</title>
                  <circle cx={p.x} cy={p.y} r="3" fill={COLOR_CUMULATIVE} />
                  <circle cx={p.x} cy={p.y} r="9" fill="transparent" />
                </g>
              ))}
            </g>
          )}
        </svg>
      </div>
    </div>
  )
})
