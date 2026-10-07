import {
  ROUTE,
  STATION_BY_ID,
  WASH_LABEL,
  capacityPerHour,
  type WashType,
} from '../../../lib/carwash'

const GARNET = '#a52547'
const PIPE_EDGE = '#78716c'
/** vertical gradients: lit along the top, dark underneath, so a pipe reads as a cylinder */
const PIPE_FILL = 'url(#ch7a-pipe)'
const KINK_FILL = 'url(#ch7a-kink)'

/** px of pipe diameter per car per hour */
const K = 8
const W = 1000
const H = 250
const Y = 126 // pipe centerline
const X0 = 70
const LEN = 112
const REDUCER = 30
/** how squashed the end ellipses are — the pipe seen slightly from the side */
const MOUTH = 0.16
/** shapes overlap by this much so no hairline shows between them */
const SEAM = 0.6

const fmt = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 1 })

/**
 * One wash's route as a straight hose: each station is a length of pipe
 * as wide as its flow (cars per hour), joined by reducers and expanders,
 * open at the left and rounded off at the right. The narrowest pipe, and
 * the reducer that squeezes into it, are garnet — the kink that sets how
 * much can get through the whole leg.
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
  const first = segs[0]
  const last = segs[segs.length - 1]
  const mouthRx = first.d * MOUTH
  const capRx = last.d * MOUTH

  // the top and bottom edges of the whole hose, as one polyline each
  const top = segs.flatMap((s) => [`${s.x1},${Y - s.d / 2}`, `${s.x2},${Y - s.d / 2}`])
  const bottom = segs.flatMap((s) => [`${s.x1},${Y + s.d / 2}`, `${s.x2},${Y + s.d / 2}`])

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full min-w-[640px]"
        role="img"
        aria-label={`The ${WASH_LABEL[type]} wash as a hose: pipes as wide as each station's flow`}
      >
        <defs>
          <linearGradient id="ch7a-pipe" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d6d3d1" />
            <stop offset="0.3" stopColor="#b4aea9" />
            <stop offset="1" stopColor="#625c57" />
          </linearGradient>
          <linearGradient id="ch7a-kink" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e4879d" />
            <stop offset="0.3" stopColor="#c53e5d" />
            <stop offset="1" stopColor="#5a0b24" />
          </linearGradient>
          <linearGradient id="ch7a-mouth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3f3a37" />
            <stop offset="1" stopColor="#8a837d" />
          </linearGradient>
        </defs>

        {/* in */}
        <text x={X0 - mouthRx - 12} y={Y - 4} textAnchor="end" fontSize={11} fill="#78716c">
          {WASH_LABEL[type]}
        </text>
        <text x={X0 - mouthRx - 12} y={Y + 10} textAnchor="end" fontSize={11} fill="#78716c">
          cars in →
        </text>

        {/* pipe bodies — no strokes, so no seams between sections */}
        {segs.map((s, i) => {
          const hot = s.id === bottleneck
          const prev = segs[i - 1]
          const fill = hot ? KINK_FILL : PIPE_FILL
          return (
            <g key={s.id}>
              {prev && (
                <polygon
                  points={`${prev.x2 - SEAM},${Y - prev.d / 2} ${s.x1 + SEAM},${Y - s.d / 2} ${s.x1 + SEAM},${Y + s.d / 2} ${prev.x2 - SEAM},${Y + prev.d / 2}`}
                  fill={fill}
                />
              )}
              <rect
                x={s.x1 - (i === 0 ? 0 : SEAM)}
                y={Y - s.d / 2}
                width={LEN + (i === 0 ? 0 : SEAM) + (i === segs.length - 1 ? 0 : SEAM)}
                height={s.d}
                fill={fill}
              />
            </g>
          )
        })}

        {/* rounded-off far end */}
        <path
          d={`M${end - SEAM},${Y - last.d / 2} A${capRx},${last.d / 2} 0 0 1 ${end - SEAM},${Y + last.d / 2} Z`}
          fill={last.id === bottleneck ? KINK_FILL : PIPE_FILL}
        />
        <path
          d={`M${end},${Y - last.d / 2} A${capRx},${last.d / 2} 0 0 1 ${end},${Y + last.d / 2}`}
          fill="none"
          stroke={PIPE_EDGE}
          strokeWidth={1.2}
        />

        {/* top and bottom outlines */}
        <polyline points={top.join(' ')} fill="none" stroke={PIPE_EDGE} strokeWidth={1.2} strokeLinejoin="round" />
        <polyline points={bottom.join(' ')} fill="none" stroke={PIPE_EDGE} strokeWidth={1.2} strokeLinejoin="round" />

        {/* the open mouth */}
        <ellipse
          cx={X0}
          cy={Y}
          rx={mouthRx}
          ry={first.d / 2}
          fill="url(#ch7a-mouth)"
          stroke={PIPE_EDGE}
          strokeWidth={1.2}
        />

        {/* labels */}
        {segs.map((s) => {
          const hot = s.id === bottleneck
          const cx = s.x1 + LEN / 2
          return (
            <g key={s.id}>
              <text
                x={cx}
                y={Y - s.d / 2 - 22}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                fill={hot ? GARNET : '#1c1917'}
              >
                {s.id}
              </text>
              <text
                x={cx}
                y={Y - s.d / 2 - 8}
                textAnchor="middle"
                fontSize={11.5}
                fill={hot ? GARNET : '#44403c'}
              >
                {fmt(s.cap)} cars / hr
              </text>
              <text x={cx} y={Y + s.d / 2 + 15} textAnchor="middle" fontSize={10.5} fill="#78716c">
                {STATION_BY_ID[s.id].minutes} min per car
              </text>
              {hot && (
                <>
                  <text
                    x={cx}
                    y={Y + s.d / 2 + 31}
                    textAnchor="middle"
                    fontSize={11.5}
                    fontWeight={700}
                    fill={GARNET}
                  >
                    “the kink”
                  </text>
                  <text x={cx} y={Y + s.d / 2 + 45} textAnchor="middle" fontSize={10.5} fill={GARNET}>
                    (bottleneck)
                  </text>
                </>
              )}
            </g>
          )
        })}

        {/* out */}
        <text x={end + capRx + 14} y={Y - 4} fontSize={11} fill="#78716c">
          at most
        </text>
        <text x={end + capRx + 14} y={Y + 11} fontSize={12} fontWeight={700} fill="#1c1917">
          {fmt(minCap)} cars / hr
        </text>
      </svg>
    </div>
  )
}
