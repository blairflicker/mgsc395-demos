import {
  ROUTE,
  STATION_BY_ID,
  WASH_LABEL,
  capacityPerHour,
  type WashType,
} from '../../../lib/carwash'

const GARNET = '#a52547'
const PIPE = '#a8a29e'
const PIPE_EDGE = '#78716c'

/** px of pipe diameter per car per hour */
const K = 4
const W = 1000
const H = 215
const Y = 108 // pipe centerline
const X0 = 56
const LEN = 112
const REDUCER = 30

const fmt = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 1 })

/**
 * One wash's route as a straight hose: each station is a length of pipe
 * as wide as its flow (cars per hour), joined by reducers and expanders.
 * The narrowest pipe, and the reducer that squeezes into it, are garnet —
 * the kink that sets how much can get through the whole leg.
 */
export function Hose({ type }: { type: WashType }) {
  const ids = ROUTE[type]
  const caps = ids.map((id) => capacityPerHour(STATION_BY_ID[id]))
  const minCap = Math.min(...caps)
  const bottleneck = ids[caps.indexOf(minCap)]

  let x = X0
  const segs = ids.map((id, i) => {
    const s = { id, x1: x, x2: x + LEN, d: K * caps[i], cap: caps[i] }
    x += LEN + REDUCER
    return s
  })
  const end = x - REDUCER
  const dOut = segs[segs.length - 1].d

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full min-w-[640px]"
        role="img"
        aria-label={`The ${WASH_LABEL[type]} wash as a hose: pipes as wide as each station's flow`}
      >
        {/* in */}
        <text x={X0 - 10} y={Y - 4} textAnchor="end" fontSize={11} fill="#78716c">
          {WASH_LABEL[type]}
        </text>
        <text x={X0 - 10} y={Y + 10} textAnchor="end" fontSize={11} fill="#78716c">
          cars in →
        </text>

        {segs.map((s, i) => {
          const hot = s.id === bottleneck
          const prev = segs[i - 1]
          const fill = hot ? GARNET : PIPE
          const edge = hot ? GARNET : PIPE_EDGE
          return (
            <g key={s.id}>
              {prev && (
                <polygon
                  points={`${prev.x2},${Y - prev.d / 2} ${s.x1},${Y - s.d / 2} ${s.x1},${Y + s.d / 2} ${prev.x2},${Y + prev.d / 2}`}
                  fill={fill}
                  stroke={edge}
                  strokeWidth={1}
                />
              )}
              <rect
                x={s.x1}
                y={Y - s.d / 2}
                width={LEN}
                height={s.d}
                fill={fill}
                stroke={edge}
                strokeWidth={1}
              />
              <text
                x={s.x1 + LEN / 2}
                y={Y - s.d / 2 - 22}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                fill={hot ? GARNET : '#1c1917'}
              >
                {s.id}
              </text>
              <text
                x={s.x1 + LEN / 2}
                y={Y - s.d / 2 - 8}
                textAnchor="middle"
                fontSize={11.5}
                fill={hot ? GARNET : '#44403c'}
              >
                {fmt(s.cap)} cars / hr
              </text>
              <text
                x={s.x1 + LEN / 2}
                y={Y + s.d / 2 + 15}
                textAnchor="middle"
                fontSize={10.5}
                fill="#78716c"
              >
                {STATION_BY_ID[s.id].minutes} min per car
              </text>
              {hot && (
                <text
                  x={s.x1 + LEN / 2}
                  y={Y + s.d / 2 + 31}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill={GARNET}
                >
                  the kink — nothing gets past faster
                </text>
              )}
            </g>
          )
        })}

        {/* out */}
        <polygon
          points={`${end},${Y - dOut / 2 - 6} ${end + 14},${Y} ${end},${Y + dOut / 2 + 6}`}
          fill={PIPE_EDGE}
        />
        <text x={end + 24} y={Y - 4} fontSize={11} fill="#78716c">
          at most
        </text>
        <text x={end + 24} y={Y + 11} fontSize={12} fontWeight={700} fill="#1c1917">
          {fmt(minCap)} cars / hr
        </text>
      </svg>
    </div>
  )
}
