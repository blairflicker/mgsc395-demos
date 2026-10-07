import {
  MIX_LIMITS,
  STATIONS,
  capacityPerHour,
  feasibleRegion,
  servedBy,
  type Rates,
} from '../../../lib/carwash'

const GARNET = '#a52547'
const W = 340
const H = 320
const ML = 44
const MR = 14
const MT = 18
const MB = 42

/**
 * The (Standard, Deluxe) plane. The shaded region is every pair of rates
 * the wash can finish without a line growing somewhere; the hollow point
 * is what arrives, the filled point what actually comes out the end.
 */
export function MixChart({
  arrivals,
  throughput,
  max,
}: {
  arrivals: Rates
  throughput: Rates
  /** axis maximum, cars per hour (the slider ceiling) */
  max: number
}) {
  const sx = (s: number) => ML + (s / max) * (W - ML - MR)
  const sy = (d: number) => H - MB - (d / max) * (H - MT - MB)

  const S = MIX_LIMITS.standard.capacity
  const D = MIX_LIMITS.deluxe.capacity
  const T = MIX_LIMITS.total.capacity
  const region = feasibleRegion()
    .map((p) => `${sx(p.s)},${sy(p.d)}`)
    .join(' ')

  // shared stations that are not the tightest: lighter diagonals
  const otherShared = STATIONS.filter(
    (s) => servedBy(s.id).length === 2 && s.id !== MIX_LIMITS.total.stationId,
  ).map((s) => ({ id: s.id, cap: capacityPerHour(s) }))

  const ticks: number[] = []
  for (let v = 0; v <= max; v += 2) ticks.push(v)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block h-auto w-full max-w-sm"
      role="img"
      aria-label="Feasible output mix of Standard and Deluxe cars per hour"
    >
      {/* grid + axes */}
      {ticks.map((v) => (
        <g key={v} fontSize={10} fill="#78716c">
          <line x1={sx(v)} x2={sx(v)} y1={sy(0)} y2={sy(max)} stroke="#f5f5f4" />
          <line x1={sx(0)} x2={sx(max)} y1={sy(v)} y2={sy(v)} stroke="#f5f5f4" />
          <text x={sx(v)} y={sy(0) + 14} textAnchor="middle">
            {v}
          </text>
          <text x={sx(0) - 6} y={sy(v) + 3} textAnchor="end">
            {v}
          </text>
        </g>
      ))}
      <line x1={sx(0)} x2={sx(max)} y1={sy(0)} y2={sy(0)} stroke="#a8a29e" />
      <line x1={sx(0)} x2={sx(0)} y1={sy(0)} y2={sy(max)} stroke="#a8a29e" />
      <text
        x={(sx(0) + sx(max)) / 2}
        y={H - 6}
        textAnchor="middle"
        fontSize={11}
        fill="#44403c"
      >
        Standard cars / hr
      </text>
      <text
        transform={`translate(12, ${(sy(0) + sy(max)) / 2}) rotate(-90)`}
        textAnchor="middle"
        fontSize={11}
        fill="#44403c"
      >
        Deluxe cars / hr
      </text>

      {/* what the wash can finish */}
      <polygon points={region} fill="#fbe5e9" stroke={GARNET} strokeWidth={1.5} />

      {/* the three binding stations */}
      <g fontSize={10} fontWeight={600} fill={GARNET}>
        <line
          x1={sx(S)}
          x2={sx(S)}
          y1={sy(0)}
          y2={sy(max)}
          stroke={GARNET}
          strokeDasharray="4 3"
        />
        <text x={sx(S) + 4} y={sy(max) + 10}>
          {MIX_LIMITS.standard.stationId} · {S}/hr
        </text>
        <line
          x1={sx(0)}
          x2={sx(max)}
          y1={sy(D)}
          y2={sy(D)}
          stroke={GARNET}
          strokeDasharray="4 3"
        />
        <text x={sx(max) - 4} y={sy(D) - 4} textAnchor="end">
          {MIX_LIMITS.deluxe.stationId} · {D}/hr
        </text>
        <line
          x1={sx(T)}
          x2={sx(0)}
          y1={sy(0)}
          y2={sy(T)}
          stroke={GARNET}
          strokeDasharray="4 3"
        />
        <text x={sx(T / 2) + 6} y={sy(T / 2) - 6}>
          {MIX_LIMITS.total.stationId} · {T}/hr total
        </text>
      </g>

      {/* the looser shared stations, for comparison */}
      <g fontSize={10} fill="#a8a29e">
        {otherShared.map(({ id, cap }) =>
          cap <= max ? (
            <g key={id}>
              <line
                x1={sx(cap)}
                x2={sx(0)}
                y1={sy(0)}
                y2={sy(cap)}
                stroke="#d6d3d1"
                strokeDasharray="2 4"
              />
              <text x={sx(cap / 2) + 6} y={sy(cap / 2) - 4}>
                {id} · {cap}/hr
              </text>
            </g>
          ) : null,
        )}
      </g>

      {/* arrivals → what comes out */}
      <line
        x1={sx(arrivals.standard)}
        y1={sy(arrivals.deluxe)}
        x2={sx(throughput.standard)}
        y2={sy(throughput.deluxe)}
        stroke="#292524"
        strokeDasharray="3 3"
      />
      <circle
        cx={sx(arrivals.standard)}
        cy={sy(arrivals.deluxe)}
        r={6}
        fill="#fff"
        stroke="#292524"
        strokeWidth={2}
      >
        <title>{`arriving: ${arrivals.standard} Standard + ${arrivals.deluxe} Deluxe per hour`}</title>
      </circle>
      <circle
        cx={sx(throughput.standard)}
        cy={sy(throughput.deluxe)}
        r={6}
        fill="#292524"
      >
        <title>{`finishing: ${throughput.standard.toFixed(1)} Standard + ${throughput.deluxe.toFixed(1)} Deluxe per hour`}</title>
      </circle>

      {/* legend */}
      <g fontSize={10} fill="#57534e" transform={`translate(${sx(max) - 118}, ${sy(max) + 4})`}>
        <circle cx={6} cy={0} r={4.5} fill="#fff" stroke="#292524" strokeWidth={1.5} />
        <text x={14} y={3}>arriving</text>
        <circle cx={66} cy={0} r={4.5} fill="#292524" />
        <text x={74} y={3}>finishing</text>
      </g>
    </svg>
  )
}
