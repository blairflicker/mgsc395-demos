import { memo, useMemo, useRef } from 'react'
import type { CpmSchedule, ScheduledActivity } from '../../../lib/cpm'
import { layoutNetwork, type LayoutPoint } from '../../../lib/cpm'
import {
  COLOR_CRITICAL,
  COLOR_MUTED_STROKE,
  CRITICAL_FILL,
  INK,
  INK_MUTED,
  INK_SOFT,
} from './palette'

const NODE_W = 92
const NODE_H = 62
const PILL_W = 70
const PILL_H = 34

const EPS = 1e-9

interface Edge {
  from: string // activity id or 'START'
  to: string // activity id or 'FINISH'
  critical: boolean
  p1: LayoutPoint
  p2: LayoutPoint
}

/** An arrow is on the critical path when both endpoints have zero slack and
 *  the link is tight (the successor's EST equals this predecessor's EFT). */
function edgeIsCritical(from: string, to: string, s: CpmSchedule): boolean {
  if (from === 'START') {
    const v = s.byId[to]
    return v.critical && Math.abs(v.est) < EPS
  }
  if (to === 'FINISH') {
    const u = s.byId[from]
    return u.critical && Math.abs(u.eft - s.projectDuration) < EPS
  }
  const u = s.byId[from]
  const v = s.byId[to]
  return u.critical && v.critical && Math.abs(v.est - u.eft) < EPS
}

/** Spread the connection points of parallel arrows along a node's side so
 *  they don't pile onto one pixel. */
function spreadOffset(index: number, count: number, maxSpan: number): number {
  if (count <= 1) return 0
  const gap = Math.min(14, maxSpan / (count - 1))
  return (index - (count - 1) / 2) * gap
}

interface ResolvedLayout {
  pos: Record<string, LayoutPoint>
  start: LayoutPoint
  finish: LayoutPoint
  width: number
  height: number
}

function buildEdges(schedule: CpmSchedule, layout: ResolvedLayout): Edge[] {
  const centerOf = (id: string) =>
    id === 'START' ? layout.start : id === 'FINISH' ? layout.finish : layout.pos[id]
  const halfW = (id: string) =>
    id === 'START' || id === 'FINISH' ? PILL_W / 2 : NODE_W / 2
  const halfH = (id: string) =>
    id === 'START' || id === 'FINISH' ? PILL_H / 2 : NODE_H / 2

  const raw: { from: string; to: string }[] = []
  for (const a of schedule.activities) {
    if (a.predecessors.length === 0) raw.push({ from: 'START', to: a.id })
    for (const p of a.predecessors) raw.push({ from: p, to: a.id })
    if (a.successors.length === 0) raw.push({ from: a.id, to: 'FINISH' })
  }

  /** edges between two vertically stacked ACTIVITY nodes connect
   *  top-to-bottom (like J → K in the textbook figure); arrows to and from
   *  the Start/Finish pills always run horizontally */
  const isVertical = (e: { from: string; to: string }) =>
    e.from !== 'START' &&
    e.to !== 'FINISH' &&
    Math.abs(centerOf(e.to).x - centerOf(e.from).x) < 40

  // group HORIZONTAL edges by endpoint for fan offsets, sorted by far-end y
  const outgoing: Record<string, { to: string }[]> = {}
  const incoming: Record<string, { from: string }[]> = {}
  for (const e of raw) {
    if (isVertical(e)) continue
    ;(outgoing[e.from] ??= []).push({ to: e.to })
    ;(incoming[e.to] ??= []).push({ from: e.from })
  }
  for (const k of Object.keys(outgoing))
    outgoing[k].sort((a, b) => centerOf(a.to).y - centerOf(b.to).y)
  for (const k of Object.keys(incoming))
    incoming[k].sort((a, b) => centerOf(a.from).y - centerOf(b.from).y)

  return raw.map((e) => {
    const c1 = centerOf(e.from)
    const c2 = centerOf(e.to)
    const critical = edgeIsCritical(e.from, e.to, schedule)
    if (isVertical(e)) {
      const up = c2.y < c1.y
      return {
        ...e,
        critical,
        p1: { x: c1.x, y: c1.y + (up ? -halfH(e.from) : halfH(e.from)) },
        p2: { x: c2.x, y: c2.y + (up ? halfH(e.to) : -halfH(e.to)) },
      }
    }
    const outs = outgoing[e.from]
    const ins = incoming[e.to]
    const fromOff = spreadOffset(
      outs.findIndex((o) => o.to === e.to),
      outs.length,
      NODE_H - 18,
    )
    const toOff = spreadOffset(
      ins.findIndex((o) => o.from === e.from),
      ins.length,
      NODE_H - 18,
    )
    const backwards = c2.x - c1.x < 0
    return {
      ...e,
      critical,
      p1: { x: c1.x + (backwards ? -halfW(e.from) : halfW(e.from)), y: c1.y + fromOff },
      p2: { x: c2.x + (backwards ? halfW(e.to) : -halfW(e.to)), y: c2.y + toOff },
    }
  })
}

function ActivityNode({
  a,
  pos,
  hideAnswers,
  onPointerDown,
}: {
  a: ScheduledActivity
  pos: LayoutPoint
  hideAnswers: boolean
  onPointerDown: (e: React.PointerEvent) => void
}) {
  const { x, y } = pos
  const crit = !hideAnswers && a.critical
  const cornerInk = crit ? INK_SOFT : INK_MUTED
  return (
    <g onPointerDown={onPointerDown} style={{ cursor: 'grab' }}>
      <title>
        {hideAnswers
          ? `${a.id}${a.name ? `. ${a.name}` : ''} — ${a.duration} wk · fill in EST, EFT, LST, LFT · drag to move`
          : `${a.id}${a.name ? `. ${a.name}` : ''} — ${a.duration} wk · EST ${a.est}, EFT ${a.eft}, LST ${a.lst}, LFT ${a.lft} · slack ${a.slack}${crit ? ' (critical)' : ''} · drag to move`}
      </title>
      <rect
        x={x - NODE_W / 2}
        y={y - NODE_H / 2}
        width={NODE_W}
        height={NODE_H}
        rx={10}
        fill={crit ? CRITICAL_FILL : 'white'}
        stroke={crit ? COLOR_CRITICAL : COLOR_MUTED_STROKE}
        strokeWidth={crit ? 2.5 : 1.5}
      />
      {!hideAnswers && (
        <>
          <text x={x - 39} y={y - 15} fontSize="14" fill={cornerInk} className="tabular-nums">
            {a.est}
          </text>
          <text x={x + 39} y={y - 15} fontSize="14" fill={cornerInk} textAnchor="end" className="tabular-nums">
            {a.eft}
          </text>
          <text x={x - 39} y={y + 26} fontSize="14" fill={cornerInk} className="tabular-nums">
            {a.lst}
          </text>
          <text x={x + 39} y={y + 26} fontSize="14" fill={cornerInk} textAnchor="end" className="tabular-nums">
            {a.lft}
          </text>
        </>
      )}
      <text
        x={x}
        y={y}
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
        fill={crit ? INK : INK_MUTED}
      >
        {a.id}
      </text>
      <text
        x={x}
        y={y + 13}
        textAnchor="middle"
        fontSize="10"
        fill={INK_MUTED}
        className="tabular-nums"
      >
        {a.duration}
      </text>
    </g>
  )
}

function Pill({ at, label }: { at: LayoutPoint; label: string }) {
  return (
    <g>
      <rect
        x={at.x - PILL_W / 2}
        y={at.y - PILL_H / 2}
        width={PILL_W}
        height={PILL_H}
        rx={PILL_H / 2}
        fill={CRITICAL_FILL}
        stroke={COLOR_CRITICAL}
        strokeWidth={2}
      />
      <text
        x={at.x}
        y={at.y + 4}
        textAnchor="middle"
        fontSize="11"
        fontWeight="600"
        fill={INK_SOFT}
      >
        {label}
      </text>
    </g>
  )
}

/** The node-anatomy key shown in the legend. */
function KeyNode() {
  return (
    <svg viewBox="0 0 150 66" width="150" height="66" aria-hidden>
      <rect x="29" y="3" width="92" height="60" rx="10" fill="white" stroke={COLOR_MUTED_STROKE} strokeWidth="1.5" />
      <text x="36" y="18" fontSize="10" fill={INK_MUTED}>EST</text>
      <text x="114" y="18" fontSize="10" fill={INK_MUTED} textAnchor="end">EFT</text>
      <text x="36" y="56" fontSize="10" fill={INK_MUTED}>LST</text>
      <text x="114" y="56" fontSize="10" fill={INK_MUTED} textAnchor="end">LFT</text>
      <text x="75" y="32" textAnchor="middle" fontSize="10" fontWeight="600" fill={INK_SOFT}>
        Activity
      </text>
      <text x="75" y="44" textAnchor="middle" fontSize="8.5" fill={INK_MUTED}>
        weeks
      </text>
    </svg>
  )
}

/**
 * The project network: an SVG DAG, Start on the left, Finish on the right,
 * laid out automatically from the precedence structure (the class project
 * uses the textbook figure's arrangement). Every activity box is draggable,
 * and the arrangement is passed back up so the PDF worksheet matches.
 */
export const Network = memo(function Network({
  schedule,
  hideAnswers = false,
  overrides,
  onMove,
}: {
  schedule: CpmSchedule
  hideAnswers?: boolean
  /** user-dragged node centers, keyed by activity id */
  overrides: Record<string, LayoutPoint>
  onMove: (id: string, pos: LayoutPoint) => void
}) {
  const layout = useMemo<ResolvedLayout>(() => {
    const base = layoutNetwork(schedule.activities)
    return {
      ...base,
      pos: Object.fromEntries(
        schedule.activities.map((a) => [
          a.id,
          overrides[a.id] ?? base.pos[a.id],
        ]),
      ),
    }
  }, [schedule, overrides])
  const edges = useMemo(() => buildEdges(schedule, layout), [schedule, layout])

  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null)

  /** map a pointer event to viewBox coordinates */
  const svgPoint = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * layout.width,
      y: ((e.clientY - rect.top) / rect.height) * layout.height,
    }
  }

  const startDrag = (e: React.PointerEvent, id: string) => {
    const p = svgPoint(e)
    const c = layout.pos[id]
    dragRef.current = { id, dx: c.x - p.x, dy: c.y - p.y }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const p = svgPoint(e)
    onMove(drag.id, {
      x: Math.min(layout.width - NODE_W / 2 - 4, Math.max(NODE_W / 2 + 4, p.x + drag.dx)),
      y: Math.min(layout.height - NODE_H / 2 - 4, Math.max(NODE_H / 2 + 4, p.y + drag.dy)),
    })
  }
  const endDrag = () => {
    dragRef.current = null
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-stone-500">
          {!hideAnswers && (
            <span className="flex items-center gap-1.5">
              <svg width="22" height="8" aria-hidden>
                <line x1="0" y1="4" x2="22" y2="4" stroke={COLOR_CRITICAL} strokeWidth="2.5" />
              </svg>
              Critical path — zero slack
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <svg width="22" height="8" aria-hidden>
              <line x1="0" y1="4" x2="22" y2="4" stroke={COLOR_MUTED_STROKE} strokeWidth="1.5" />
            </svg>
            {hideAnswers ? 'Precedence arrow' : 'Has slack'}
          </span>
          <span className="text-stone-400">
            drag any box to rearrange the diagram
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span>How to read a node:</span>
          <KeyNode />
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="w-full touch-none select-none"
          style={{ minWidth: Math.min(layout.width * 0.75, 700) }}
          role="img"
          aria-label={
            hideAnswers
              ? 'Project network diagram — work out the four scheduling values for each node'
              : 'Project network diagram with the critical path highlighted'
          }
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <defs>
            <marker id="cpm-arrow-critical" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={COLOR_CRITICAL} />
            </marker>
            <marker id="cpm-arrow-muted" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={COLOR_MUTED_STROKE} />
            </marker>
          </defs>
          {/* muted arrows underneath, critical arrows on top */}
          {edges
            .filter((e) => hideAnswers || !e.critical)
            .map((e) => (
              <line
                key={`${e.from}-${e.to}`}
                x1={e.p1.x}
                y1={e.p1.y}
                x2={e.p2.x}
                y2={e.p2.y}
                stroke={COLOR_MUTED_STROKE}
                strokeWidth="1.5"
                markerEnd="url(#cpm-arrow-muted)"
              />
            ))}
          {!hideAnswers &&
            edges
              .filter((e) => e.critical)
              .map((e) => (
                <line
                  key={`${e.from}-${e.to}`}
                  x1={e.p1.x}
                  y1={e.p1.y}
                  x2={e.p2.x}
                  y2={e.p2.y}
                  stroke={COLOR_CRITICAL}
                  strokeWidth="2.5"
                  markerEnd="url(#cpm-arrow-critical)"
                />
              ))}
          <Pill at={layout.start} label="Start" />
          <Pill at={layout.finish} label="Finish" />
          {schedule.activities.map((a) => (
            <ActivityNode
              key={a.id}
              a={a}
              pos={layout.pos[a.id]}
              hideAnswers={hideAnswers}
              onPointerDown={(e) => startDrag(e, a.id)}
            />
          ))}
        </svg>
      </div>
    </div>
  )
})
