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
const LEN = 116
/** how squashed the round ends are — the pipe seen slightly from the side */
const ROUND = 0.18
/** shapes overlap by this much so no hairline shows between them */
const SEAM = 0.6

const fmt = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 1 })

interface Seg {
  id: string
  cap: number
  /** diameter, px */
  d: number
  /** horizontal radius of this pipe's round ends */
  rx: number
  /** body extents */
  x1: number
  x2: number
  /** this pipe is wider than the one before it, so it shows a round face
   *  at x1 that the narrower pipe runs into */
  face: boolean
}

/**
 * One wash's route as a straight hose: each station is a length of pipe
 * as wide as its flow (cars per hour). Every pipe ends in a domed cap;
 * a narrower pipe emerges from the dome's surface, and a wider pipe
 * presents a round face that the narrower one runs into — so the hose
 * steps down and up like fitted plumbing. With answers on, the narrowest
 * pipe and the dome squeezing into it are garnet: the kink.
 */
export function Hose({ type, showAnswers }: { type: WashType; showAnswers: boolean }) {
  const ids = ROUTE[type]
  const caps = ids.map((id) => capacityPerHour(STATION_BY_ID[id]))
  const minCap = Math.min(...caps)
  const bottleneck = showAnswers ? ids[caps.indexOf(minCap)] : null

  // lay the pipes out left to right; each transition is a curve, so the
  // next body starts where it meets the previous dome (narrowing) or where
  // its own face meets the previous body (widening)
  const segs: Seg[] = []
  let x = X0
  ids.forEach((id, i) => {
    const d = K * caps[i]
    const rx = d * ROUND
    const prev = segs[i - 1]
    let face = false
    if (prev) {
      if (d < prev.d) {
        // emerge from the previous dome where it is this pipe's height
        x = prev.x2 + prev.rx * Math.sqrt(1 - (d / prev.d) ** 2)
      } else if (d > prev.d) {
        // this pipe's face sits so its surface meets the previous body end
        x = prev.x2 + rx * Math.sqrt(1 - (prev.d / d) ** 2)
        face = true
      } else {
        x = prev.x2
      }
    }
    segs.push({ id, cap: caps[i], d, rx, x1: x, x2: x + LEN, face })
  })
  const first = segs[0]
  const last = segs[segs.length - 1]

  // the silhouette: top edge left to right, round the far cap, bottom edge
  let top = `M${X0},${Y - first.d / 2}`
  let bottom = `M${X0},${Y + first.d / 2}`
  segs.forEach((s, i) => {
    top += ` H${s.x2}`
    bottom += ` H${s.x2}`
    const next = segs[i + 1]
    if (!next) {
      top += ` A${s.rx},${s.d / 2} 0 0 1 ${s.x2},${Y + s.d / 2}`
    } else if (next.d < s.d) {
      top += ` A${s.rx},${s.d / 2} 0 0 1 ${next.x1},${Y - next.d / 2}`
      bottom += ` A${s.rx},${s.d / 2} 0 0 0 ${next.x1},${Y + next.d / 2}`
    } else if (next.d > s.d) {
      top += ` A${next.rx},${next.d / 2} 0 0 1 ${next.x1},${Y - next.d / 2}`
      bottom += ` A${next.rx},${next.d / 2} 0 0 0 ${next.x1},${Y + next.d / 2}`
    }
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
        <text x={X0 - first.rx - 12} y={Y - 4} textAnchor="end" fontSize={11} fill="#78716c">
          {WASH_LABEL[type]}
        </text>
        <text x={X0 - first.rx - 12} y={Y + 10} textAnchor="end" fontSize={11} fill="#78716c">
          cars in →
        </text>

        {/* pipe bodies, left to right: round face (if wider), body, dome */}
        {segs.map((s, i) => {
          const fill = s.id === bottleneck ? KINK_FILL : PIPE_FILL
          const isLast = i === segs.length - 1
          return (
            <g key={s.id}>
              {s.face && <ellipse cx={s.x1} cy={Y} rx={s.rx} ry={s.d / 2} fill={fill} />}
              <rect
                x={s.x1 - SEAM}
                y={Y - s.d / 2}
                width={LEN + 2 * SEAM}
                height={s.d}
                fill={fill}
              />
              <path
                d={`M${s.x2 - SEAM},${Y - s.d / 2} A${s.rx},${s.d / 2} 0 0 1 ${s.x2 - SEAM},${Y + s.d / 2} Z`}
                fill={fill}
              />
              {isLast && (
                <path
                  d={`M${s.x2},${Y - s.d / 2} A${s.rx},${s.d / 2} 0 0 1 ${s.x2},${Y + s.d / 2}`}
                  fill="none"
                  stroke={PIPE_EDGE}
                  strokeWidth={1.2}
                />
              )}
            </g>
          )
        })}

        {/* silhouette */}
        <path d={top} fill="none" stroke={PIPE_EDGE} strokeWidth={1.2} strokeLinejoin="round" />
        <path d={bottom} fill="none" stroke={PIPE_EDGE} strokeWidth={1.2} strokeLinejoin="round" />

        {/* the open mouth */}
        <ellipse
          cx={X0}
          cy={Y}
          rx={first.rx}
          ry={first.d / 2}
          fill="url(#ch7a-mouth)"
          stroke={PIPE_EDGE}
          strokeWidth={1.2}
        />

        {/* labels */}
        {segs.map((s) => {
          const hot = s.id === bottleneck
          const cx = (s.x1 + s.x2) / 2
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
        <text x={last.x2 + last.rx + 14} y={Y - 4} fontSize={11} fill="#78716c">
          at most
        </text>
        <text
          x={last.x2 + last.rx + 14}
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
