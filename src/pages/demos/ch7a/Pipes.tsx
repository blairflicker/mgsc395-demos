import {
  MIX_LIMITS,
  STATION_BY_ID,
  WASH_TYPES,
  capacityPerHour,
  totalRate,
  type FluidResult,
  type Rates,
} from '../../../lib/carwash'
import { TYPE_COLOR } from './Network'

const GARNET = '#a52547'
const PIPE_FILL = '#e7e5e4'
const PIPE_EDGE = '#a8a29e'

/** px of pipe diameter per car per hour */
const K = 3
const W = 1028
const H = 390
const ROW = { top: 80, mid: 190, bot: 300 }

const dia = (id: string) => K * capacityPerHour(STATION_BY_ID[id])

/** water band heights by type, scaled down together if they overfill the pipe */
function bands(r: Rates, d: number): number[] {
  const hs = WASH_TYPES.map((t) => K * r[t])
  const total = hs.reduce((a, b) => a + b, 0)
  return total > d + 1e-6 ? hs.map((h) => (h * d) / total) : hs
}

const fmt = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 1 })

const BOTTLENECK_TAG: Record<string, string> = {
  [MIX_LIMITS.standard.stationId]: 'Standard bottleneck',
  [MIX_LIMITS.deluxe.stationId]: 'Deluxe bottleneck',
  [MIX_LIMITS.total.stationId]: 'Process bottleneck',
}

/**
 * A horizontal run of pipe from x1 to x2 whose diameter may change along
 * the way (a reducer or expander), with the water inside drawn as stacked
 * bands — Standard on top, Deluxe beneath — whose heights follow the flow.
 */
function Segment({
  x1,
  x2,
  y,
  dL,
  dR,
  bL,
  bR,
  stroke = PIPE_EDGE,
  strokeWidth = 1.5,
}: {
  x1: number
  x2: number
  y: number
  dL: number
  dR: number
  bL: number[]
  bR: number[]
  stroke?: string
  strokeWidth?: number
}) {
  const totL = bL.reduce((a, b) => a + b, 0)
  const totR = bR.reduce((a, b) => a + b, 0)
  let cumL = y - totL / 2
  let cumR = y - totR / 2
  const water = WASH_TYPES.map((t, i) => {
    const pts = `${x1},${cumL} ${x2},${cumR} ${x2},${cumR + bR[i]} ${x1},${cumL + bL[i]}`
    cumL += bL[i]
    cumR += bR[i]
    return bL[i] + bR[i] > 0.01 ? (
      <polygon key={t} points={pts} fill={TYPE_COLOR[t]} opacity={0.8} />
    ) : null
  })
  return (
    <g>
      <polygon
        points={`${x1},${y - dL / 2} ${x2},${y - dR / 2} ${x2},${y + dR / 2} ${x1},${y + dL / 2}`}
        fill={PIPE_FILL}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {water}
    </g>
  )
}

/**
 * A vertical manifold joining the middle row to the top and bottom rows:
 * Standard water runs through its upper half, Deluxe through its lower.
 */
function Manifold({
  x,
  w,
  yTop,
  yBot,
  standardW,
  deluxeW,
}: {
  x: number
  w: number
  yTop: number
  yBot: number
  standardW: number
  deluxeW: number
}) {
  const cx = x + w / 2
  return (
    <g>
      <rect x={x} y={yTop} width={w} height={yBot - yTop} rx={3} fill={PIPE_FILL} stroke={PIPE_EDGE} strokeWidth={1.5} />
      {standardW > 0.01 && (
        <rect
          x={cx - standardW / 2}
          y={yTop + 2}
          width={standardW}
          height={ROW.mid - yTop - 2}
          fill={TYPE_COLOR.standard}
          opacity={0.8}
        />
      )}
      {deluxeW > 0.01 && (
        <rect
          x={cx - deluxeW / 2}
          y={ROW.mid}
          width={deluxeW}
          height={yBot - ROW.mid - 2}
          fill={TYPE_COLOR.deluxe}
          opacity={0.8}
        />
      )}
    </g>
  )
}

/**
 * The wash as plumbing. Each station is a length of pipe whose diameter
 * is its capacity (3 px per car per hour), joined by reducers and
 * expanders; the water inside is the steady flow at the current dials.
 * Where more water reaches a pipe than it can pass, the reducer in front
 * of it turns garnet — that is the kink in the hose.
 */
export function Pipes({
  arrivals,
  flows,
  showBottlenecks,
}: {
  arrivals: Rates
  flows: FluidResult
  showBottlenecks: boolean
}) {
  const out = (id: string) => flows.byId[id].outflow
  const inn = (id: string) => flows.byId[id].inflow
  const backed = (id: string) => flows.byId[id].accumulation > 0.005

  /** a station's own length of pipe, with its labels */
  const station = (id: string, x1: number, x2: number, y: number) => {
    const d = dia(id)
    const f = flows.byId[id]
    const tag = showBottlenecks ? BOTTLENECK_TAG[id] : undefined
    const cx = (x1 + x2) / 2
    return (
      <g key={id}>
        <Segment
          x1={x1}
          x2={x2}
          y={y}
          dL={d}
          dR={d}
          bL={bands(out(id), d)}
          bR={bands(out(id), d)}
          stroke={tag ? GARNET : PIPE_EDGE}
          strokeWidth={tag ? 3 : 1.5}
        />
        <text x={cx} y={y - d / 2 - 22} textAnchor="middle" fontSize={10} fill="#78716c">
          {STATION_BY_ID[id].minutes} min per car
        </text>
        <text x={cx} y={y - d / 2 - 8} textAnchor="middle" fontSize={12} fill="#1c1917">
          <tspan fontWeight={700}>{id}</tspan> · {fmt(f.capacity)} / hr
        </text>
        <text x={cx} y={y + d / 2 + 14} textAnchor="middle" fontSize={10.5} fill="#57534e">
          carries {fmt(f.outTotal)} / hr
        </text>
        {backed(id) && (
          <text x={cx} y={y + d / 2 + 28} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={GARNET}>
            +{fmt(f.accumulation)} / hr back up
          </text>
        )}
        {tag && (
          <text
            x={cx}
            y={y + d / 2 + (backed(id) ? 42 : 28)}
            textAnchor="middle"
            fontSize={10.5}
            fontWeight={700}
            fill={GARNET}
          >
            {tag}
          </text>
        )}
      </g>
    )
  }

  /** the reducer or expander feeding station `to` from a pipe of diameter dL carrying `flowIn` */
  const inlet = (to: string, x1: number, x2: number, y: number, dL: number, flowIn: Rates) => {
    const d = dia(to)
    const kink = backed(to)
    return (
      <Segment
        key={`in-${to}`}
        x1={x1}
        x2={x2}
        y={y}
        dL={dL}
        dR={d}
        bL={bands(flowIn, dL)}
        bR={bands(out(to), d)}
        stroke={kink ? GARNET : PIPE_EDGE}
        strokeWidth={kink ? 2.5 : 1.5}
      />
    )
  }

  const dSplit = dia('A2')
  const splitX = 298
  const dMerge = dia('A8')
  const mergeX = 788
  const inflowA8 = inn('A8')

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full min-w-[720px]"
        role="img"
        aria-label="Keith's Car Wash drawn as pipes whose diameters are each station's capacity"
      >
        {/* legend */}
        <g fontSize={12} fill="#57534e">
          <rect x={12} y={13} width={12} height={10} fill={TYPE_COLOR.standard} opacity={0.8} />
          <text x={30} y={23}>Standard water</text>
          <rect x={128} y={13} width={12} height={10} fill={TYPE_COLOR.deluxe} opacity={0.8} />
          <text x={146} y={23}>Deluxe water</text>
          <text x={W - 10} y={23} textAnchor="end" fill="#78716c">
            pipe diameter = capacity · water = actual flow
          </text>
        </g>

        {/* what comes in */}
        <text x={4} y={ROW.mid - 3} fontSize={11} fill="#57534e">
          in
        </text>
        <text x={4} y={ROW.mid + 11} fontSize={11} fontWeight={600} fill="#1c1917">
          {fmt(totalRate(arrivals))} / hr
        </text>

        <g transform="translate(28, 0)">
        {/* branch labels, in the gap left of the manifold */}
        <text x={splitX - 8} y={ROW.top + 44} textAnchor="end" fontSize={12} fill="#57534e">
          Standard
        </text>
        <text x={splitX - 8} y={ROW.bot - 38} textAnchor="end" fontSize={12} fill="#57534e">
          Deluxe
        </text>

        {/* A1 → A2 */}
        {station('A1', 30, 148, ROW.mid)}
        {inlet('A2', 148, 174, ROW.mid, dia('A1'), out('A1'))}
        {station('A2', 174, splitX, ROW.mid)}

        {/* the split */}
        <Manifold
          x={splitX}
          w={dSplit}
          yTop={ROW.top - dSplit / 2}
          yBot={ROW.bot + dSplit / 2}
          standardW={bands({ standard: out('A2').standard, deluxe: 0 }, dSplit)[0]}
          deluxeW={bands({ standard: 0, deluxe: out('A2').deluxe }, dSplit)[1]}
        />

        {/* Standard leg */}
        {inlet('A3', splitX + dSplit, 354, ROW.top, dSplit, inn('A3'))}
        {station('A3', 354, 472, ROW.top)}
        {inlet('A4', 472, 498, ROW.top, dia('A3'), inn('A4'))}
        {station('A4', 498, 616, ROW.top)}
        <Segment x1={616} x2={mergeX} y={ROW.top} dL={dia('A4')} dR={dia('A4')} bL={bands(out('A4'), dia('A4'))} bR={bands(out('A4'), dia('A4'))} />

        {/* Deluxe leg */}
        {inlet('A5', splitX + dSplit, 354, ROW.bot, dSplit, inn('A5'))}
        {station('A5', 354, 472, ROW.bot)}
        {inlet('A6', 472, 498, ROW.bot, dia('A5'), inn('A6'))}
        {station('A6', 498, 616, ROW.bot)}
        {inlet('A7', 616, 642, ROW.bot, dia('A6'), inn('A7'))}
        {station('A7', 642, 760, ROW.bot)}
        <Segment x1={760} x2={mergeX} y={ROW.bot} dL={dia('A7')} dR={dia('A7')} bL={bands(out('A7'), dia('A7'))} bR={bands(out('A7'), dia('A7'))} />

        {/* the merge */}
        <Manifold
          x={mergeX}
          w={dMerge}
          yTop={ROW.top - dia('A4') / 2 - 2}
          yBot={ROW.bot + dia('A7') / 2 + 2}
          standardW={bands({ standard: inflowA8.standard, deluxe: 0 }, dMerge)[0]}
          deluxeW={bands({ standard: 0, deluxe: inflowA8.deluxe }, dMerge)[1]}
        />

        {/* A8 → out */}
        {inlet('A8', mergeX + dMerge, 832, ROW.mid, dMerge, inflowA8)}
        {station('A8', 832, 950, ROW.mid)}
        <Segment x1={950} x2={984} y={ROW.mid} dL={dMerge} dR={dMerge} bL={bands(flows.throughput, dMerge)} bR={bands(flows.throughput, dMerge)} />
        <polygon
          points={`${984},${ROW.mid - dMerge / 2 - 6} ${996},${ROW.mid} ${984},${ROW.mid + dMerge / 2 + 6}`}
          fill={PIPE_EDGE}
        />
        <text x={992} y={ROW.mid - dMerge / 2 - 10} textAnchor="end" fontSize={11} fontWeight={600} fill="#1c1917">
          out {fmt(flows.totalThroughput)} / hr
        </text>
        </g>
      </svg>
    </div>
  )
}
