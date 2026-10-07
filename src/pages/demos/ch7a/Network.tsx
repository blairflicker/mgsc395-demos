import { memo } from 'react'
import {
  STATIONS,
  STATION_BY_ID,
  type CarView,
  type FluidResult,
  type SimView,
  type WashType,
} from '../../../lib/carwash'

/** validated chart palette — one color per wash type */
export const TYPE_COLOR: Record<WashType, string> = {
  standard: '#1d4ed8',
  deluxe: '#b45309',
}
const GARNET = '#a52547'

const W = 1100
const H = 380
const R = 27 // station radius
const DOT_R = 6
const QUEUE_COLS = 5
const QUEUE_ROWS = 2
/** dots drawn per line; the badge above carries the real count */
export const QUEUE_VISIBLE = QUEUE_COLS * QUEUE_ROWS

/** station centers, laid out like the slide */
const NODE: Record<string, { x: number; y: number }> = {
  A1: { x: 110, y: 190 },
  A2: { x: 250, y: 190 },
  A3: { x: 600, y: 80 },
  A4: { x: 760, y: 80 },
  A5: { x: 560, y: 300 },
  A6: { x: 720, y: 300 },
  A7: { x: 880, y: 300 },
  A8: { x: 1040, y: 190 },
}
const SPLIT = { x: 395, y: 190 }

/** the slide's pastel per station */
const FILL: Record<string, string> = {
  A1: '#c3e4c9',
  A2: '#f3a57f',
  A3: '#c1e0f6',
  A4: '#9ea7dd',
  A5: '#f8d0b8',
  A6: '#8fd09e',
  A7: '#d9d79f',
  A8: '#d1cfea',
}

const EDGES = [
  'M137,190 H221',
  'M277,190 H343',
  'M395,146 V80 H571',
  'M395,234 V300 H531',
  'M627,80 H731',
  'M787,80 H1040 V161',
  'M587,300 H691',
  'M747,300 H851',
  'M907,300 H1040 V219',
  'M1067,190 H1096',
]

/** center of the pile of waiting cars in front of a station */
const pileCenter = (id: string) => ({
  x: NODE[id].x - R - 14 - ((QUEUE_COLS - 1) * 13) / 2,
  y: NODE[id].y,
})

function dotPos(c: CarView): { x: number; y: number } {
  if (c.role === 'done' || !c.stationId) return { x: W + 30, y: NODE.A8.y }
  const n = NODE[c.stationId]
  if (c.role === 'service') return { x: n.x, y: n.y }
  const col = c.queueIndex % QUEUE_COLS
  const row = Math.floor(c.queueIndex / QUEUE_COLS)
  return { x: n.x - R - 14 - col * 13, y: n.y - 7 + row * 14 }
}

const fmtCap = (v: number) =>
  v.toLocaleString('en-US', { maximumFractionDigits: 1 })

/**
 * The wash as a network. Stations are circles that darken while busy;
 * each has a small pile of waiting cars in front of it (the first ten in
 * line) with a badge carrying the true count, so a line that outgrows the
 * pile keeps counting. With answers on, each station shows its capacity in
 * cars/hr and, where cars pile up, how fast they do — in garnet.
 */
export const Network = memo(function Network({
  view,
  flows,
  showAnswers,
}: {
  view: SimView
  flows: FluidResult
  showAnswers: boolean
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full min-w-[720px]"
        role="img"
        aria-label="Keith's Car Wash: eight stations with cars moving through them"
      >
        <defs>
          <marker
            id="ch7a-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="#a8a29e" />
          </marker>
        </defs>

        {/* legend */}
        <g fontSize={12} fill="#57534e">
          <circle cx={18} cy={20} r={5} fill={TYPE_COLOR.standard} />
          <text x={28} y={24}>Standard</text>
          <circle cx={98} cy={20} r={5} fill={TYPE_COLOR.deluxe} />
          <text x={108} y={24}>Deluxe</text>
          <text x={W - 10} y={24} textAnchor="end" fill="#78716c">
            finished cars leave →
          </text>
        </g>

        {/* edges */}
        {EDGES.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="#a8a29e"
            strokeWidth={2.5}
            markerEnd="url(#ch7a-arrow)"
          />
        ))}

        {/* the split */}
        <polygon
          points={`${SPLIT.x - 50},${SPLIT.y} ${SPLIT.x},${SPLIT.y - 44} ${SPLIT.x + 50},${SPLIT.y} ${SPLIT.x},${SPLIT.y + 44}`}
          fill="#fbe9b0"
          stroke="#d6b65a"
          strokeWidth={1.5}
        />
        <text
          x={SPLIT.x}
          y={SPLIT.y - 3}
          textAnchor="middle"
          fontSize={12}
          fill="#44403c"
        >
          Standard
        </text>
        <text
          x={SPLIT.x}
          y={SPLIT.y + 12}
          textAnchor="middle"
          fontSize={12}
          fill="#44403c"
        >
          or Deluxe
        </text>
        <text x={SPLIT.x - 10} y={126} textAnchor="end" fontSize={13} fill="#57534e">
          Standard
        </text>
        <text x={SPLIT.x - 10} y={262} textAnchor="end" fontSize={13} fill="#57534e">
          Deluxe
        </text>

        {/* stations */}
        {STATIONS.map((s) => {
          const n = NODE[s.id]
          const busy = view.busy[s.id]
          const waiting = view.queueLength[s.id]
          const flow = flows.byId[s.id]
          const piling = showAnswers && flow.accumulation > 0.005
          const pile = pileCenter(s.id)
          return (
            <g key={s.id}>
              <circle
                cx={n.x}
                cy={n.y}
                r={R}
                fill={FILL[s.id]}
                stroke={piling ? GARNET : busy ? '#44403c' : '#a8a29e'}
                strokeWidth={piling ? 3 : 2}
                strokeDasharray={busy || piling ? undefined : '4 3'}
              />
              <text
                x={n.x}
                y={n.y - 3}
                textAnchor="middle"
                fontSize={14}
                fontWeight={600}
                fill="#1c1917"
              >
                {s.id}
              </text>
              <text
                x={n.x}
                y={n.y + 12}
                textAnchor="middle"
                fontSize={11}
                fill="#44403c"
              >
                {s.minutes} min
              </text>
              {s.note && !showAnswers && (
                <text
                  x={n.x}
                  y={n.y + R + 15}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#78716c"
                >
                  {s.note}
                </text>
              )}

              {/* how many are in line */}
              {waiting > 0 && (
                <g transform={`translate(${pile.x}, ${n.y - 38})`}>
                  <rect
                    x={-36}
                    y={-10}
                    width={72}
                    height={20}
                    rx={10}
                    fill="#292524"
                  />
                  <text
                    y={4}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    fill="#fff"
                  >
                    {waiting.toLocaleString('en-US')} waiting
                  </text>
                </g>
              )}

              {showAnswers && (
                <>
                  <g transform={`translate(${n.x}, ${n.y + R + 15})`}>
                    <rect
                      x={-32}
                      y={-10}
                      width={64}
                      height={20}
                      rx={10}
                      fill="#fff"
                      stroke={piling ? GARNET : '#d6d3d1'}
                    />
                    <text
                      y={4}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={600}
                      fill={piling ? GARNET : '#44403c'}
                    >
                      {fmtCap(flow.capacity)} / hr
                    </text>
                  </g>
                  {piling && (
                    <text
                      x={pile.x}
                      y={n.y + 36}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={700}
                      fill={GARNET}
                    >
                      +{fmtCap(flow.accumulation)} / hr pile up
                    </text>
                  )}
                </>
              )}
            </g>
          )
        })}

        {/* cars */}
        {view.cars.map((c) => {
          const { x, y } = dotPos(c)
          return (
            <g
              key={c.id}
              style={{
                transform: `translate(${x}px, ${y}px)`,
                transition: 'transform 450ms ease-in-out, opacity 450ms ease-in',
                opacity: c.role === 'done' ? 0 : 1,
              }}
            >
              <circle
                r={DOT_R}
                fill={TYPE_COLOR[c.type]}
                stroke="#fff"
                strokeWidth={1.5}
                className="ch7a-arrive"
              >
                <title>
                  {`${c.type === 'standard' ? 'Standard' : 'Deluxe'} car #${c.id}${
                    c.stationId
                      ? c.role === 'service'
                        ? ` — at ${c.stationId} (${STATION_BY_ID[c.stationId].minutes} min)`
                        : ` — waiting for ${c.stationId}`
                      : ' — done'
                  }`}
                </title>
              </circle>
            </g>
          )
        })}
      </svg>
    </div>
  )
})
