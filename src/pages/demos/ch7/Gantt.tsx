import { memo } from 'react'
import type { CpmSchedule } from '../../../lib/cpm'
import {
  COLOR_CRITICAL,
  COLOR_MUTED,
  COLOR_REFERENCE,
  COLOR_SLACK,
  GRID,
  INK_MUTED,
  INK_SOFT,
} from './palette'

const VW = 760
const M = { top: 18, right: 46, bottom: 26, left: 34 }
const ROW_H = 26
const BAR_H = 14
const PLOT_W = VW - M.left - M.right

/**
 * Gantt chart of the earliest-start schedule. Each bar sits at its EST and
 * runs for its estimated time; the lighter whisker shows how far the
 * activity could slip (to its LFT) without delaying the project. Critical
 * activities are garnet and have no whisker at all.
 */
export const Gantt = memo(function Gantt({ schedule }: { schedule: CpmSchedule }) {
  const acts = schedule.activities
  const dur = schedule.projectDuration
  const axisMax = Math.max(10, Math.ceil((dur + 1) / 10) * 10)
  const step = axisMax <= 30 ? 5 : axisMax <= 90 ? 10 : axisMax <= 180 ? 20 : 40
  const vh = M.top + acts.length * ROW_H + M.bottom

  const x = (weeks: number) => M.left + (weeks / axisMax) * PLOT_W
  const rowCenter = (i: number) => M.top + i * ROW_H + ROW_H / 2

  const ticks: number[] = []
  for (let w = 0; w <= axisMax; w += step) ticks.push(w)

  const finishX = x(dur)
  const finishAnchor = finishX > VW - 60 ? 'end' : 'middle'

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm" style={{ backgroundColor: COLOR_CRITICAL }} />
          Critical — zero slack
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm" style={{ backgroundColor: COLOR_MUTED }} />
          Has slack
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-4 rounded-full" style={{ backgroundColor: COLOR_SLACK }} />
          Slack — room to slip until the LFT
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden>
            <line x1="0" y1="4" x2="18" y2="4" stroke={COLOR_REFERENCE} strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          Project finish
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${VW} ${vh}`}
          className="w-full min-w-140"
          role="img"
          aria-label="Gantt chart of the earliest-start schedule with slack whiskers"
        >
          {/* week gridlines */}
          {ticks.map((w) => (
            <g key={w}>
              <line x1={x(w)} y1={M.top} x2={x(w)} y2={vh - M.bottom} stroke={GRID} strokeWidth="1" />
              <text x={x(w)} y={vh - M.bottom + 15} textAnchor="middle" fontSize="10" fill={INK_MUTED} className="tabular-nums">
                {w === ticks[ticks.length - 1] ? `${w} wks` : w}
              </text>
            </g>
          ))}

          {acts.map((a, i) => {
            const cy = rowCenter(i)
            const barX = x(a.est)
            const barW = Math.max(x(a.eft) - x(a.est), 2)
            return (
              <g key={a.id}>
                <title>
                  {`${a.id}. ${a.name} — weeks ${a.est}–${a.eft}` +
                    (a.slack > 0
                      ? ` · slack ${a.slack} (can slip to week ${a.lft})`
                      : ' · critical, no slack')}
                </title>
                <text x={M.left - 8} y={cy + 4} textAnchor="end" fontSize="11" fontWeight="600" fill={INK_SOFT}>
                  {a.id}
                </text>
                {a.slack > 0 && (
                  <>
                    <rect
                      x={x(a.eft)}
                      y={cy - 2.5}
                      width={Math.max(x(a.lft) - x(a.eft), 0)}
                      height={5}
                      rx={2.5}
                      fill={COLOR_SLACK}
                    />
                    <line x1={x(a.lft)} y1={cy - 6} x2={x(a.lft)} y2={cy + 6} stroke={COLOR_SLACK} strokeWidth="2" />
                  </>
                )}
                <rect
                  x={barX}
                  y={cy - BAR_H / 2}
                  width={barW}
                  height={BAR_H}
                  rx={3}
                  fill={a.critical ? COLOR_CRITICAL : COLOR_MUTED}
                />
              </g>
            )
          })}

          {/* project finish reference line */}
          <line
            x1={finishX}
            y1={M.top - 4}
            x2={finishX}
            y2={vh - M.bottom}
            stroke={COLOR_REFERENCE}
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
          <text
            x={finishAnchor === 'end' ? finishX - 4 : finishX}
            y={M.top - 7}
            textAnchor={finishAnchor}
            fontSize="10"
            fontWeight="600"
            fill={COLOR_REFERENCE}
            className="tabular-nums"
          >
            week {dur}
          </text>
        </svg>
      </div>
    </div>
  )
})
