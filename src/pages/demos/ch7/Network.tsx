import { memo } from 'react'
import type { CpmSchedule, ScheduledActivity } from '../../../lib/cpm'
import {
  COLOR_CRITICAL,
  COLOR_MUTED_STROKE,
  CRITICAL_FILL,
  INK,
  INK_MUTED,
  INK_SOFT,
} from './palette'

const VW = 960
const VH = 440
const NODE_W = 92
const NODE_H = 62
const PILL_W = 70
const PILL_H = 34

/** Hand-tuned left-to-right layout for the St. John's network (the graph
 *  structure never changes — only the numbers inside the nodes do). */
const POS: Record<string, { x: number; y: number }> = {
  A: { x: 185, y: 150 },
  B: { x: 185, y: 310 },
  I: { x: 350, y: 70 },
  F: { x: 350, y: 150 },
  C: { x: 350, y: 230 },
  D: { x: 350, y: 310 },
  E: { x: 350, y: 390 },
  G: { x: 515, y: 230 },
  H: { x: 515, y: 310 },
  J: { x: 655, y: 310 },
  K: { x: 790, y: 150 },
}
const START = { x: 55, y: 230 }
const FINISH = { x: 913, y: 150 }

type Side = 'left' | 'right' | 'top' | 'bottom'

interface EdgeSpec {
  from: string // activity id or 'START'
  to: string // activity id or 'FINISH'
  fromSide?: Side
  toSide?: Side
  /** perpendicular offset along the chosen side, px */
  fromOffset?: number
  toOffset?: number
}

const EDGES: EdgeSpec[] = [
  { from: 'START', to: 'A' },
  { from: 'START', to: 'B' },
  { from: 'A', to: 'I' },
  { from: 'A', to: 'F' },
  { from: 'A', to: 'C' },
  { from: 'B', to: 'D' },
  { from: 'B', to: 'E' },
  { from: 'C', to: 'G' },
  { from: 'D', to: 'H' },
  { from: 'E', to: 'J', toSide: 'bottom' },
  { from: 'G', to: 'J', toSide: 'top', toOffset: -14 },
  { from: 'H', to: 'J' },
  { from: 'F', to: 'K' },
  { from: 'I', to: 'K', toOffset: -14 },
  { from: 'J', to: 'K', fromSide: 'top', fromOffset: 22, toSide: 'bottom' },
  { from: 'K', to: 'FINISH' },
]

function center(id: string) {
  if (id === 'START') return START
  if (id === 'FINISH') return FINISH
  return POS[id]
}

function size(id: string) {
  return id === 'START' || id === 'FINISH'
    ? { w: PILL_W, h: PILL_H }
    : { w: NODE_W, h: NODE_H }
}

function anchor(id: string, side: Side, offset = 0) {
  const { x, y } = center(id)
  const { w, h } = size(id)
  switch (side) {
    case 'left':
      return { x: x - w / 2, y: y + offset }
    case 'right':
      return { x: x + w / 2, y: y + offset }
    case 'top':
      return { x: x + offset, y: y - h / 2 }
    case 'bottom':
      return { x: x + offset, y: y + h / 2 }
  }
}

const EPS = 1e-9

/** An arrow is on the critical path when both endpoints have zero slack and
 *  the link is tight (the successor's EST equals this predecessor's EFT). */
function edgeIsCritical(e: EdgeSpec, s: CpmSchedule): boolean {
  if (e.from === 'START') {
    const v = s.byId[e.to]
    return v.critical && Math.abs(v.est) < EPS
  }
  if (e.to === 'FINISH') {
    const u = s.byId[e.from]
    return u.critical && Math.abs(u.eft - s.projectDuration) < EPS
  }
  const u = s.byId[e.from]
  const v = s.byId[e.to]
  return u.critical && v.critical && Math.abs(v.est - u.eft) < EPS
}

function ActivityNode({ a }: { a: ScheduledActivity }) {
  const { x, y } = POS[a.id]
  const crit = a.critical
  return (
    <g>
      <title>
        {`${a.id}. ${a.name} — ${a.duration} wk · EST ${a.est}, EFT ${a.eft}, LST ${a.lst}, LFT ${a.lft} · slack ${a.slack}${crit ? ' (critical)' : ''}`}
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
      {/* EST | EFT across the top, LST | LFT across the bottom */}
      <text x={x - 38} y={y - 18} fontSize="10" fill={crit ? INK_SOFT : INK_MUTED} className="tabular-nums">
        {a.est}
      </text>
      <text x={x + 38} y={y - 18} fontSize="10" fill={crit ? INK_SOFT : INK_MUTED} textAnchor="end" className="tabular-nums">
        {a.eft}
      </text>
      <text x={x - 38} y={y + 25} fontSize="10" fill={crit ? INK_SOFT : INK_MUTED} className="tabular-nums">
        {a.lst}
      </text>
      <text x={x + 38} y={y + 25} fontSize="10" fill={crit ? INK_SOFT : INK_MUTED} textAnchor="end" className="tabular-nums">
        {a.lft}
      </text>
      <text x={x} y={y + 5} textAnchor="middle" fill={crit ? INK : INK_MUTED}>
        <tspan fontSize="15" fontWeight="700">
          {a.id}
        </tspan>
        <tspan fontSize="9" dx="5" fill={INK_MUTED}>
          {a.duration} wk
        </tspan>
      </text>
    </g>
  )
}

function Pill({ id, label }: { id: 'START' | 'FINISH'; label: string }) {
  const { x, y } = center(id)
  return (
    <g>
      <rect
        x={x - PILL_W / 2}
        y={y - PILL_H / 2}
        width={PILL_W}
        height={PILL_H}
        rx={PILL_H / 2}
        fill={CRITICAL_FILL}
        stroke={COLOR_CRITICAL}
        strokeWidth={2}
      />
      <text
        x={x}
        y={y + 4}
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
      <text x="37" y="17" fontSize="9" fill={INK_MUTED}>EST</text>
      <text x="113" y="17" fontSize="9" fill={INK_MUTED} textAnchor="end">EFT</text>
      <text x="37" y="55" fontSize="9" fill={INK_MUTED}>LST</text>
      <text x="113" y="55" fontSize="9" fill={INK_MUTED} textAnchor="end">LFT</text>
      <text x="75" y="37" textAnchor="middle" fontSize="10" fontWeight="600" fill={INK_SOFT}>
        Activity · wks
      </text>
    </svg>
  )
}

/**
 * The project network: an SVG DAG, Start on the left, Finish on the right.
 * Zero-slack nodes and tight arrows are drawn in garnet; everything with
 * slack is muted stone.
 */
export const Network = memo(function Network({ schedule }: { schedule: CpmSchedule }) {
  const edges = EDGES.map((e) => {
    const critical = edgeIsCritical(e, schedule)
    const p1 = anchor(e.from, e.fromSide ?? 'right', e.fromOffset ?? 0)
    const p2 = anchor(e.to, e.toSide ?? 'left', e.toOffset ?? 0)
    return { ...e, critical, p1, p2 }
  })

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-stone-500">
          <span className="flex items-center gap-1.5">
            <svg width="22" height="8" aria-hidden>
              <line x1="0" y1="4" x2="22" y2="4" stroke={COLOR_CRITICAL} strokeWidth="2.5" />
            </svg>
            Critical path — zero slack
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="22" height="8" aria-hidden>
              <line x1="0" y1="4" x2="22" y2="4" stroke={COLOR_MUTED_STROKE} strokeWidth="1.5" />
            </svg>
            Has slack
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span>How to read a node:</span>
          <KeyNode />
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full min-w-175"
          role="img"
          aria-label="Project network diagram with the critical path highlighted"
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
            .filter((e) => !e.critical)
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
          {edges
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
          <Pill id="START" label="Start" />
          <Pill id="FINISH" label="Finish" />
          {schedule.activities.map((a) => (
            <ActivityNode key={a.id} a={a} />
          ))}
        </svg>
      </div>
    </div>
  )
})
