import { memo, useRef } from 'react'
import {
  GRID_MAX_X,
  GRID_MAX_Y,
  round1,
  type CustomerInput,
  type DistanceMetric,
  type Point,
} from '../../../lib/cog'
import {
  COLOR_CG,
  COLOR_CUSTOMER,
  COLOR_CUSTOMER_STROKE,
  COLOR_PIN,
  GRID,
  GRID_AXIS,
  INK,
  INK_MUTED,
  INK_SOFT,
} from './palette'

const UNIT = 42 // px per grid unit
const ML = 38 // left margin (y-axis numbers)
const MT = 20
const MR = 20
const MB = 36 // bottom margin (x-axis numbers)
const W = ML + GRID_MAX_X * UNIT + MR
const H = MT + GRID_MAX_Y * UNIT + MB

const MAX_R = 32 // radius of the heaviest customer's circle
const MIN_R = 3.5

const px = (x: number) => ML + x * UNIT
const py = (y: number) => MT + (GRID_MAX_Y - y) * UNIT

const fmt1 = (v: number) => v.toFixed(1)

/** map labels use the city only — "Akron, OH" → "Akron" */
function shortName(name: string): string {
  const comma = name.indexOf(',')
  return comma === -1 ? name : name.slice(0, comma)
}

/** a stable pseudo-random fraction per customer (hash of its id) that
 *  places the extra rectilinear break — stable so lines don't jitter as
 *  the pin drags, different per customer so paths rarely overlap */
function elbowFraction(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973
  return 0.35 + 0.45 * (h / 9973)
}

function PinIcon() {
  return (
    <svg viewBox="0 0 14 14" width="12" height="12" aria-hidden>
      <path
        d="M7 13 C4.8 9.6 3.2 8 3.2 5.8 A3.8 3.8 0 1 1 10.8 5.8 C10.8 8 9.2 9.6 7 13 Z"
        fill={COLOR_PIN}
      />
      <circle cx="7" cy="5.6" r="1.6" fill="white" />
    </svg>
  )
}

function CgIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden>
      <line x1="8" y1="0.5" x2="8" y2="15.5" stroke={COLOR_CG} strokeWidth="1.8" />
      <line x1="0.5" y1="8" x2="15.5" y2="8" stroke={COLOR_CG} strokeWidth="1.8" />
      <circle cx="8" cy="8" r="4.2" fill="white" stroke={COLOR_CG} strokeWidth="1.8" />
    </svg>
  )
}

/**
 * The coordinate-grid "map": customers drawn as circles whose AREA is
 * proportional to their load, the center of gravity marked with a garnet
 * crosshair, and a draggable pin for the student's proposed facility.
 * Dragging uses pointer events like ch7's Network; the pin snaps to 0.1.
 */
/** distance lines — bold enough to read against the gridlines; the hover
 *  highlight color lives in index.css (.dist-group:hover .dist-line) */
const DIST_LINE = '#78716c'

export const LocationMap = memo(function LocationMap({
  customers,
  cg,
  pin,
  showAnswers,
  showDistances,
  metric,
  onPinMove,
}: {
  customers: CustomerInput[]
  /** the CG marker position (already rounded to 0.1), or null to hide it */
  cg: Point | null
  pin: Point
  showAnswers: boolean
  /** draw a distance path from every customer to the pin */
  showDistances: boolean
  /** straight lines for Euclidean, L-shaped city-block paths for rectilinear */
  metric: DistanceMetric
  onPinMove: (p: Point) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)

  /** map a pointer event to viewBox coordinates */
  const svgPoint = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    }
  }

  const startDrag = (e: React.PointerEvent) => {
    const p = svgPoint(e)
    dragRef.current = { dx: px(pin.x) - p.x, dy: py(pin.y) - p.y }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const p = svgPoint(e)
    const ux = (p.x + drag.dx - ML) / UNIT
    const uy = GRID_MAX_Y - (p.y + drag.dy - MT) / UNIT
    onPinMove({
      x: Math.min(GRID_MAX_X, Math.max(0, round1(ux))),
      y: Math.min(GRID_MAX_Y, Math.max(0, round1(uy))),
    })
  }
  const endDrag = () => {
    dragRef.current = null
  }

  const maxLoad = Math.max(...customers.map((c) => c.load), 1)
  const rFor = (load: number) =>
    Math.max(MIN_R, MAX_R * Math.sqrt(Math.max(load, 0) / maxLoad))

  // biggest circles first so small neighbors stay on top and hoverable
  const drawOrder = [...customers].sort((a, b) => b.load - a.load)

  const xTicks = Array.from({ length: GRID_MAX_X / 2 + 1 }, (_, i) => i * 2)
  const yTicks = Array.from({ length: GRID_MAX_Y / 2 + 1 }, (_, i) => i * 2)

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 14 14" width="13" height="13" aria-hidden>
            <circle
              cx="7"
              cy="7"
              r="5.5"
              fill={COLOR_CUSTOMER}
              fillOpacity="0.28"
              stroke={COLOR_CUSTOMER_STROKE}
              strokeWidth="1.5"
            />
          </svg>
          Customer — circle area = load
        </span>
        {showAnswers && (
          <span className="flex items-center gap-1.5">
            <CgIcon />
            Center of gravity
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <PinIcon />
          Proposed facility
        </span>
        {showDistances && (
          <span className="flex items-center gap-1.5">
            <svg width="20" height="10" aria-hidden>
              {metric === 'rectilinear' ? (
                <path d="M1,1 H13 V9 H19" fill="none" stroke={DIST_LINE} strokeWidth="2" strokeDasharray="4 3" />
              ) : (
                <line x1="1" y1="9" x2="19" y2="1" stroke={DIST_LINE} strokeWidth="2" strokeDasharray="4 3" />
              )}
            </svg>
            Distance to pin — hover for the math
          </span>
        )}
        <span className="text-stone-400">drag the pin to test any site</span>
      </div>
      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none select-none"
          style={{ minWidth: 660 }}
          role="img"
          aria-label={
            showAnswers
              ? 'Coordinate map of the customers with the center of gravity marked and a draggable proposed-facility pin'
              : 'Coordinate map of the customers with a draggable proposed-facility pin — the center of gravity is hidden'
          }
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {/* gridlines */}
          {Array.from({ length: GRID_MAX_X + 1 }, (_, i) => (
            <line
              key={`gx${i}`}
              x1={px(i)}
              y1={py(GRID_MAX_Y)}
              x2={px(i)}
              y2={py(0)}
              stroke={i === 0 ? GRID_AXIS : GRID}
              strokeWidth={i === 0 ? 1.5 : 1}
            />
          ))}
          {Array.from({ length: GRID_MAX_Y + 1 }, (_, i) => (
            <line
              key={`gy${i}`}
              x1={px(0)}
              y1={py(i)}
              x2={px(GRID_MAX_X)}
              y2={py(i)}
              stroke={i === 0 ? GRID_AXIS : GRID}
              strokeWidth={i === 0 ? 1.5 : 1}
            />
          ))}
          {/* axis numbers */}
          {xTicks.map((t) => (
            <text
              key={`tx${t}`}
              x={px(t)}
              y={py(0) + 17}
              textAnchor="middle"
              fontSize="10.5"
              fill={INK_MUTED}
              className="tabular-nums"
            >
              {t}
            </text>
          ))}
          {yTicks.map((t) => (
            <text
              key={`ty${t}`}
              x={ML - 8}
              y={py(t) + 3.5}
              textAnchor="end"
              fontSize="10.5"
              fill={INK_MUTED}
              className="tabular-nums"
            >
              {t}
            </text>
          ))}

          {/* distance paths from every customer to the pin — straight for
              Euclidean, city-block routes for rectilinear. Rectilinear
              paths take a Z with two bends: the middle segment sits at a
              stable per-customer random spot between the customer and the
              pin, so the long runs stay off the pin's shared row/column
              and lines rarely overlap. Orientation follows the dominant
              axis of the displacement. Hover for the math. */}
          {showDistances &&
            customers.map((c) => {
              const dx = Math.abs(c.x - pin.x)
              const dy = Math.abs(c.y - pin.y)
              let d: string
              if (metric === 'euclidean') {
                d = `M${px(c.x)},${py(c.y)} L${px(pin.x)},${py(pin.y)}`
              } else if (dx >= dy) {
                // mostly horizontal — H to a random break, V, then H home
                const xm = c.x + elbowFraction(c.id) * (pin.x - c.x)
                d = `M${px(c.x)},${py(c.y)} H${px(xm)} V${py(pin.y)} H${px(pin.x)}`
              } else {
                // mostly vertical — V to a random break, H, then V home
                const ym = c.y + elbowFraction(c.id) * (pin.y - c.y)
                d = `M${px(c.x)},${py(c.y)} V${py(ym)} H${px(pin.x)} V${py(pin.y)}`
              }
              const dist =
                metric === 'euclidean' ? Math.sqrt(dx * dx + dy * dy) : dx + dy
              const calc =
                metric === 'euclidean'
                  ? `√(${fmt1(dx)}² + ${fmt1(dy)}²) = ${dist.toFixed(2)}`
                  : `${fmt1(dx)} + ${fmt1(dy)} = ${fmt1(dist)}`
              return (
                <g key={`dist-${c.id}`} className="dist-group">
                  <title>
                    {`${shortName(c.name) || 'Customer'} → pin: distance = ${calc}` +
                      `\nload = ${c.load.toLocaleString('en-US')} tons` +
                      `\nload × distance = ${Math.round(c.load * dist).toLocaleString('en-US')}`}
                  </title>
                  <path
                    d={d}
                    fill="none"
                    stroke={DIST_LINE}
                    strokeWidth="2.2"
                    strokeDasharray="6 5"
                    className="dist-line"
                  />
                  {/* fat invisible twin so the dashed line is easy to hover */}
                  <path d={d} fill="none" stroke="transparent" strokeWidth="13" />
                </g>
              )
            })}

          {/* customers — area-scaled circles with a dot at the exact point */}
          {drawOrder.map((c) => {
            const r = rFor(c.load)
            const cx = px(c.x)
            const cy = py(c.y)
            const labelAbove = cy - r - 8 > MT + 10
            const labelY = labelAbove ? cy - r - 7 : cy + r + 14
            const labelX = Math.min(Math.max(cx, ML + 30), W - MR - 30)
            return (
              <g key={c.id}>
                <title>{`${c.name} — ${c.load.toLocaleString('en-US')} tons at (${c.x}, ${c.y})`}</title>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={COLOR_CUSTOMER}
                  fillOpacity="0.28"
                  stroke={COLOR_CUSTOMER_STROKE}
                  strokeWidth="1.5"
                />
                <circle cx={cx} cy={cy} r="2" fill={COLOR_CUSTOMER_STROKE} />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="500"
                  fill={INK_SOFT}
                >
                  {shortName(c.name)}
                </text>
              </g>
            )
          })}

          {/* center of gravity — garnet crosshair */}
          {cg && (
            <g>
              <title>{`Center of gravity (${fmt1(cg.x)}, ${fmt1(cg.y)})`}</title>
              <line
                x1={px(cg.x) - 15}
                y1={py(cg.y)}
                x2={px(cg.x) + 15}
                y2={py(cg.y)}
                stroke={COLOR_CG}
                strokeWidth="2"
              />
              <line
                x1={px(cg.x)}
                y1={py(cg.y) - 15}
                x2={px(cg.x)}
                y2={py(cg.y) + 15}
                stroke={COLOR_CG}
                strokeWidth="2"
              />
              <circle
                cx={px(cg.x)}
                cy={py(cg.y)}
                r="8.5"
                fill="white"
                fillOpacity="0.6"
                stroke={COLOR_CG}
                strokeWidth="2"
              />
              <circle cx={px(cg.x)} cy={py(cg.y)} r="1.8" fill={COLOR_CG} />
              <text
                x={cg.x > GRID_MAX_X - 3 ? px(cg.x) - 19 : px(cg.x) + 19}
                y={py(cg.y) + 4}
                textAnchor={cg.x > GRID_MAX_X - 3 ? 'end' : 'start'}
                fontSize="11.5"
                fontWeight="700"
                fill={INK}
                className="tabular-nums"
              >
                CG ({fmt1(cg.x)}, {fmt1(cg.y)})
              </text>
            </g>
          )}

          {/* the draggable proposed-facility pin — its tip is the location */}
          <g
            transform={`translate(${px(pin.x)}, ${py(pin.y)})`}
            style={{ cursor: 'grab' }}
            onPointerDown={startDrag}
          >
            <title>{`Proposed facility at (${fmt1(pin.x)}, ${fmt1(pin.y)}) — drag to move`}</title>
            <circle cy={-15} r="21" fill="transparent" />
            <path
              d="M0,0 C-8,-12 -13,-16.5 -13,-24 A13,13 0 1,1 13,-24 C13,-16.5 8,-12 0,0 Z"
              fill={COLOR_PIN}
              stroke="white"
              strokeWidth="1.5"
            />
            <circle cy={-24} r="4.5" fill="white" />
            <text
              x={pin.x > GRID_MAX_X - 3 ? -17 : 17}
              y={-21}
              textAnchor={pin.x > GRID_MAX_X - 3 ? 'end' : 'start'}
              fontSize="11"
              fontWeight="600"
              fill={INK_SOFT}
              className="tabular-nums"
            >
              ({fmt1(pin.x)}, {fmt1(pin.y)})
            </text>
          </g>
        </svg>
      </div>
    </div>
  )
})
