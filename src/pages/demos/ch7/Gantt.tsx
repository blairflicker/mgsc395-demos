import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { CpmSchedule, ScheduledActivity } from '../../../lib/cpm'
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
 * Interactive Gantt chart. Every bar defaults to its Earliest Start; bars
 * with slack can be dragged anywhere inside their window (EST → LFT), but
 * never through a precedence relationship — dragging one activity late
 * visibly eats its successors' room. Elbow connectors show each
 * predecessor → successor link.
 */
export const Gantt = memo(function Gantt({ schedule }: { schedule: CpmSchedule }) {
  const acts = schedule.activities
  const dur = schedule.projectDuration
  const axisMax = Math.max(10, Math.ceil((dur + 1) / 10) * 10)
  const step = axisMax <= 30 ? 5 : axisMax <= 90 ? 10 : axisMax <= 180 ? 20 : 40
  const vh = M.top + acts.length * ROW_H + M.bottom

  const x = (weeks: number) => M.left + (weeks / axisMax) * PLOT_W
  const rowIndex = useMemo(
    () => Object.fromEntries(acts.map((a, i) => [a.id, i])),
    [acts],
  )
  const rowCenter = (id: string) => M.top + rowIndex[id] * ROW_H + ROW_H / 2

  /** scheduled starts chosen by dragging; anything unset sits at its EST */
  const [starts, setStarts] = useState<Record<string, number>>({})
  const signature = acts
    .map((a) => `${a.id}:${a.duration}:${a.predecessors.join('.')}`)
    .join('|')
  useEffect(() => {
    setStarts({})
  }, [signature])

  const startOf = (a: ScheduledActivity, s: Record<string, number>) =>
    s[a.id] ?? a.est

  /**
   * Place `id` at `desired` (clamped to its own EST–LST window) and cascade:
   * successors get pushed right, predecessors pulled left, each within its
   * own window. Feasibility is guaranteed by the CPM bounds — an activity
   * at its LST still leaves every successor room up to its own LST, and
   * symmetrically for predecessors at their ESTs — so bars never overlap
   * a precedence arrow no matter how far you drag.
   */
  const placeWithCascade = (
    s: Record<string, number>,
    id: string,
    desired: number,
  ): Record<string, number> => {
    const next = { ...s }
    const visit = (nid: string, target: number) => {
      const n = schedule.byId[nid]
      const clamped = Math.min(n.lst, Math.max(n.est, target))
      if (clamped === startOf(n, next)) return
      next[nid] = clamped
      for (const c of n.successors) {
        const ca = schedule.byId[c]
        if (startOf(ca, next) < clamped + n.duration) {
          visit(c, clamped + n.duration)
        }
      }
      for (const p of n.predecessors) {
        const pa = schedule.byId[p]
        if (startOf(pa, next) + pa.duration > clamped) {
          visit(p, clamped - pa.duration)
        }
      }
    }
    visit(id, desired)
    return next
  }

  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ id: string; pointerX: number; origin: number } | null>(null)

  const onPointerDown = (e: React.PointerEvent, a: ScheduledActivity) => {
    if (a.slack <= 0) return
    dragRef.current = { id: a.id, pointerX: e.clientX, origin: startOf(a, starts) }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    const svg = svgRef.current
    if (!drag || !svg) return
    const weekPx = (svg.getBoundingClientRect().width / VW) * (PLOT_W / axisMax)
    const dWeeks = (e.clientX - drag.pointerX) / weekPx
    setStarts((s) => {
      const desired = Math.round(drag.origin + dWeeks)
      if (desired === startOf(schedule.byId[drag.id], s)) return s
      return placeWithCascade(s, drag.id, desired)
    })
  }
  const onPointerUp = () => {
    dragRef.current = null
  }

  const anyMoved = acts.some((a) => startOf(a, starts) !== a.est)

  const ticks: number[] = []
  for (let w = 0; w <= axisMax; w += step) ticks.push(w)

  const finishX = x(dur)
  const finishAnchor = finishX > VW - 60 ? 'end' : 'middle'

  /** predecessor → successor elbow connectors at the CURRENT bar positions */
  const connectors = acts.flatMap((a) =>
    a.predecessors.map((p) => {
      const pa = schedule.byId[p]
      const x1 = x(startOf(pa, starts) + pa.duration)
      const y1 = rowCenter(p)
      const x2 = x(startOf(a, starts))
      const y2 = rowCenter(a.id)
      const taut = startOf(pa, starts) + pa.duration === startOf(a, starts)
      const critical = pa.critical && a.critical && taut
      // drop out of the predecessor's end, then run along the successor's row
      const d = `M${x1},${y1} L${x1},${y2} L${x2},${y2}`
      return { key: `${p}-${a.id}`, d, critical }
    }),
  )

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-5 gap-y-1">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-stone-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded-sm" style={{ backgroundColor: COLOR_CRITICAL }} />
            Critical — zero slack
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded-sm" style={{ backgroundColor: COLOR_MUTED }} />
            Has slack — drag me
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-4 rounded-full" style={{ backgroundColor: COLOR_SLACK }} />
            Slack window (EST → LFT)
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="16" height="12" aria-hidden>
              <path d="M2,2 L2,9 L14,9" fill="none" stroke={COLOR_SLACK} strokeWidth="1.5" />
            </svg>
            Predecessor → successor
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="18" height="8" aria-hidden>
              <line x1="0" y1="4" x2="18" y2="4" stroke={COLOR_REFERENCE} strokeWidth="2" strokeDasharray="4 3" />
            </svg>
            Project finish
          </span>
        </div>
        {anyMoved && (
          <button
            onClick={() => setStarts({})}
            className="rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50"
          >
            Snap back to earliest start
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${vh}`}
          className="w-full min-w-140 touch-none select-none"
          role="img"
          aria-label="Interactive Gantt chart: drag bars with slack anywhere inside their window"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
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

          {/* precedence connectors underneath the bars */}
          {connectors.map((c) => (
            <path
              key={c.key}
              d={c.d}
              fill="none"
              stroke={c.critical ? COLOR_CRITICAL : COLOR_SLACK}
              strokeWidth={c.critical ? 2 : 1.5}
            />
          ))}

          {acts.map((a) => {
            const cy = rowCenter(a.id)
            const s0 = startOf(a, starts)
            const barX = x(s0)
            const barW = Math.max(x(s0 + a.duration) - x(s0), 2)
            const draggable = a.slack > 0
            const moved = s0 !== a.est
            return (
              <g key={a.id}>
                <title>
                  {`${a.id}${a.name ? `. ${a.name}` : ''} — scheduled weeks ${s0}–${s0 + a.duration}` +
                    (a.slack > 0
                      ? ` · slack ${a.slack}: can sit anywhere in ${a.est}–${a.lft}`
                      : ' · critical, no slack')}
                </title>
                <text x={M.left - 8} y={cy + 4} textAnchor="end" fontSize="11" fontWeight="600" fill={INK_SOFT}>
                  {a.id}
                </text>
                {a.slack > 0 && (
                  <>
                    {/* full window EST → LFT */}
                    <rect
                      x={x(a.est)}
                      y={cy - 2.5}
                      width={Math.max(x(a.lft) - x(a.est), 0)}
                      height={5}
                      rx={2.5}
                      fill={COLOR_SLACK}
                    />
                    <line x1={x(a.est)} y1={cy - 6} x2={x(a.est)} y2={cy + 6} stroke={COLOR_SLACK} strokeWidth="2" />
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
                  stroke={moved ? INK_SOFT : 'none'}
                  strokeWidth={moved ? 1.5 : 0}
                  style={{ cursor: draggable ? 'grab' : 'default' }}
                  onPointerDown={(e) => onPointerDown(e, a)}
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
