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
/** the same gradients a shade darker, for the seams at each joint */
const PIPE_SEAM = 'url(#ch7a-pipe-seam)'
const KINK_SEAM = 'url(#ch7a-kink-seam)'

/** px of pipe diameter per car per hour */
const K = 8
const W = 1000
const H = 250
const Y = 126 // pipe centerline
const X0 = 70
const LEN = 112
const REDUCER = 30
/** how squashed the round ends are — the pipe seen slightly from the side */
const ROUND = 0.16

const fmt = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 1 })

/** rightward semi-ellipse from (x, Y−r) down to (x, Y+r) — a pipe's convex end */
const capDown = (x: number, r: number) => `A${r * ROUND},${r} 0 0 1 ${x},${Y + r}`
/** the same curve traced upward, from (x, Y+r) back to (x, Y−r) */
const capUp = (x: number, r: number) => `A${r * ROUND},${r} 0 0 0 ${x},${Y - r}`

/**
 * One wash's route as a straight hose: each station is a length of pipe
 * as wide as its flow (cars per hour), joined by straight reducers and
 * expanders. Every joint is a rightward curve — the end of one piece
 * seen slightly from the side — so the pieces read as fitted plumbing.
 * With answers on, the narrowest pipe and the reducer squeezing into it
 * are garnet: the kink.
 */
export function Hose({ type, showAnswers }: { type: WashType; showAnswers: boolean }) {
  const ids = ROUTE[type]
  const caps = ids.map((id) => capacityPerHour(STATION_BY_ID[id]))
  const minCap = Math.min(...caps)
  const bottleneck = showAnswers ? ids[caps.indexOf(minCap)] : null

  let x = X0
  const segs = ids.map((id, i) => {
    const s = { id, x1: x, x2: x + LEN, r: (K * caps[i]) / 2, cap: caps[i] }
    x += LEN + REDUCER
    return s
  })
  const end = x - REDUCER
  const first = segs[0]
  const last = segs[segs.length - 1]
  const maxR = Math.max(...segs.map((s) => s.r))

  // top and bottom silhouettes: straight along bodies, sloped across reducers
  const top = segs.flatMap((s) => [`${s.x1},${Y - s.r}`, `${s.x2},${Y - s.r}`])
  const bottom = segs.flatMap((s) => [`${s.x1},${Y + s.r}`, `${s.x2},${Y + s.r}`])

  // every joint: both ends of a body take that body's own (darker) shading
  const joints = segs.flatMap((s, i) => {
    const seam = s.id === bottleneck ? KINK_SEAM : PIPE_SEAM
    const ends: { x: number; r: number; seam: string }[] = []
    if (i > 0) ends.push({ x: s.x1, r: s.r, seam })
    if (i < segs.length - 1) ends.push({ x: s.x2, r: s.r, seam })
    return ends
  })

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full min-w-[640px]"
        role="img"
        aria-label={`The ${WASH_LABEL[type]} wash as a hose: pipes as wide as each station's flow`}
      >
        <defs>
          {/* one light source for the whole hose: pinned in page space across
              the fattest pipe, so narrow pipes on the same axis take the
              gentler middle of the run instead of cramming all of it */}
          <linearGradient id="ch7a-pipe" gradientUnits="userSpaceOnUse" x1={0} y1={Y - maxR} x2={0} y2={Y + maxR}>
            <stop offset="0" stopColor="#dad7d4" />
            <stop offset="0.28" stopColor="#bcb6b1" />
            <stop offset="0.5" stopColor="#a19b96" />
            <stop offset="1" stopColor="#5e5853" />
          </linearGradient>
          <linearGradient id="ch7a-kink" gradientUnits="userSpaceOnUse" x1={0} y1={Y - maxR} x2={0} y2={Y + maxR}>
            <stop offset="0" stopColor="#e78fa4" />
            <stop offset="0.28" stopColor="#cc4a68" />
            <stop offset="0.5" stopColor="#ad3252" />
            <stop offset="1" stopColor="#560a22" />
          </linearGradient>
          <linearGradient id="ch7a-pipe-seam" gradientUnits="userSpaceOnUse" x1={0} y1={Y - maxR} x2={0} y2={Y + maxR}>
            <stop offset="0" stopColor="#b9b5b2" />
            <stop offset="0.28" stopColor="#9b958f" />
            <stop offset="0.5" stopColor="#817b76" />
            <stop offset="1" stopColor="#433e3a" />
          </linearGradient>
          <linearGradient id="ch7a-kink-seam" gradientUnits="userSpaceOnUse" x1={0} y1={Y - maxR} x2={0} y2={Y + maxR}>
            <stop offset="0" stopColor="#cb7085" />
            <stop offset="0.28" stopColor="#aa3350" />
            <stop offset="0.5" stopColor="#8c213f" />
            <stop offset="1" stopColor="#3b0515" />
          </linearGradient>
          <linearGradient id="ch7a-mouth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3f3a37" />
            <stop offset="1" stopColor="#8a837d" />
          </linearGradient>
        </defs>

        {/* in */}
        <text x={X0 - first.r * ROUND - 12} y={Y - 4} textAnchor="end" fontSize={11} fill="#78716c">
          {WASH_LABEL[type]}
        </text>
        <text x={X0 - first.r * ROUND - 12} y={Y + 10} textAnchor="end" fontSize={11} fill="#78716c">
          cars in →
        </text>

        {/* bodies and reducers — each piece bounded by rightward curves */}
        {segs.map((s, i) => {
          const hot = s.id === bottleneck
          const prev = segs[i - 1]
          const fill = hot ? KINK_FILL : PIPE_FILL
          return (
            <g key={s.id}>
              {prev && (
                <path
                  d={`M${prev.x2},${Y - prev.r} L${s.x1},${Y - s.r} ${capDown(s.x1, s.r)} L${prev.x2},${Y + prev.r} ${capUp(prev.x2, prev.r)} Z`}
                  fill={fill}
                />
              )}
              <path
                d={`M${s.x1},${Y - s.r} H${s.x2} ${capDown(s.x2, s.r)} H${s.x1} ${capUp(s.x1, s.r)} Z`}
                fill={fill}
              />
            </g>
          )
        })}

        {/* seams: a hair wider than the gap between pieces, shaded like the pipe */}
        {joints.map((j) => (
          <path
            key={j.x}
            d={`M${j.x},${Y - j.r} ${capDown(j.x, j.r)}`}
            fill="none"
            stroke={j.seam}
            strokeWidth={1.8}
          />
        ))}

        {/* far end */}
        <path
          d={`M${end},${Y - last.r} ${capDown(end, last.r)}`}
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
          rx={first.r * ROUND}
          ry={first.r}
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
                y={Y - s.r - 22}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                fill={hot ? GARNET : '#1c1917'}
              >
                {s.id}
              </text>
              <text
                x={cx}
                y={Y - s.r - 8}
                textAnchor="middle"
                fontSize={11.5}
                fill={hot ? GARNET : '#44403c'}
              >
                {fmt(s.cap)} cars / hr
              </text>
              <text x={cx} y={Y + s.r + 15} textAnchor="middle" fontSize={10.5} fill="#78716c">
                {STATION_BY_ID[s.id].minutes} min per car
              </text>
              {hot && (
                <>
                  <text
                    x={cx}
                    y={Y + s.r + 31}
                    textAnchor="middle"
                    fontSize={11.5}
                    fontWeight={700}
                    fill={GARNET}
                  >
                    “the kink”
                  </text>
                  <text x={cx} y={Y + s.r + 45} textAnchor="middle" fontSize={10.5} fill={GARNET}>
                    (bottleneck)
                  </text>
                </>
              )}
            </g>
          )
        })}

        {/* out */}
        <text x={end + last.r * ROUND + 14} y={Y - 4} fontSize={11} fill="#78716c">
          at most
        </text>
        <text
          x={end + last.r * ROUND + 14}
          y={Y + 11}
          fontSize={12}
          fontWeight={700}
          fill={showAnswers ? '#1c1917' : '#a8a29e'}
        >
          {showAnswers ? `${fmt(minCap)} cars / hr` : '? cars / hr'}
        </text>
      </svg>
    </div>
  )
}
