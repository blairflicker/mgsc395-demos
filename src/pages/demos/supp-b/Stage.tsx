import { memo, useEffect, useRef, useState } from 'react'
import { COLOR_LAMBDA } from './charts'

const DOT = 18 // customer dot diameter, px
const SLOT_GAP = 24 // spacing between queue positions, px
const ROW_GAP = 28 // vertical spacing between serpentine rows, px
const MAX_ROWS = 4

/**
 * Each customer keeps one color for their whole visit (golden-angle hue
 * from their id), so the eye can follow an individual snaking through
 * the line, into service, and out the door.
 */
export function customerColor(id: number): string {
  const hue = (id * 137.508) % 360
  return `hsl(${hue.toFixed(1)} 62% 42%)`
}

export interface StageCustomer {
  id: number
  role: 'waiting' | 'in-service' | 'departing'
  /** queue index for waiting customers (0 = next up) */
  queueIndex?: number
}

/**
 * The animated queue lane. Customers are absolutely-positioned dots whose
 * position transitions between roles: they pop in at their queue slot,
 * snake forward through a serpentine line (like a real checkout line —
 * row 0 nearest the server, doubling back at each wall), sit in the
 * server ring while in service, and slide off the right edge on departure.
 */
export const Stage = memo(function Stage({
  customers,
  serverBusy,
  queueLength,
}: {
  customers: StageCustomer[]
  serverBusy: boolean
  queueLength: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const serverX = width - 72 // center of the server ring
  const queueHeadX = serverX - 64 // queue position 0 (front of the line)
  const minX = 24
  const laneY = 160 // row 0 (front row) vertical center
  const slotsPerRow = Math.max(1, Math.floor((queueHeadX - minX) / SLOT_GAP) + 1)
  const visibleCap = slotsPerRow * MAX_ROWS
  const exitX = width + 48

  const overflow = Math.max(0, queueLength - visibleCap)

  const posFor = (c: StageCustomer): { x: number; y: number } => {
    if (c.role === 'departing') return { x: exitX, y: laneY }
    if (c.role === 'in-service') return { x: serverX, y: laneY }
    const i = c.queueIndex ?? 0
    const row = Math.floor(i / slotsPerRow)
    const slot = i % slotsPerRow
    // serpentine: even rows run right-to-left (toward the wall), odd rows
    // double back left-to-right, always contiguous at the turns
    const x =
      row % 2 === 0 ? queueHeadX - slot * SLOT_GAP : minX + slot * SLOT_GAP
    return { x, y: laneY - row * ROW_GAP }
  }

  return (
    <div
      ref={containerRef}
      className="relative h-52 overflow-hidden rounded-xl border border-stone-200 bg-white"
    >
      {/* the-system band: everyone inside counts toward L */}
      <div
        className="absolute rounded-lg border border-garnet-200 bg-garnet-50/60"
        style={{ left: 14, right: 20, top: 40, bottom: 14 }}
      >
        <span className="absolute top-1.5 left-2.5 text-[11px] font-medium text-garnet-800">
          The system — L counts everyone in here
        </span>
      </div>

      {/* entrance label */}
      <div className="absolute top-2 left-3 flex items-center gap-1.5 text-[11px] font-medium">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: COLOR_LAMBDA }}
        />
        <span className="text-stone-600">Arrivals — rate λ</span>
        <span className="text-stone-400">→</span>
      </div>

      {/* exit label */}
      <div className="absolute top-2 right-3 text-[11px] font-medium text-stone-500">
        Departures →
      </div>

      {/* server ring */}
      <div
        className={[
          'absolute flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
          serverBusy ? 'border-garnet-500 bg-white' : 'border-dashed border-stone-300 bg-stone-50',
        ].join(' ')}
        style={{ left: serverX - 20, top: laneY - 20 }}
      />
      <span
        className="absolute text-center text-[11px] font-medium text-stone-500"
        style={{ left: serverX - 30, top: laneY + 24, width: 60 }}
      >
        {serverBusy ? 'serving' : 'server idle'}
      </span>

      {/* overflow chip when the line outgrows even the serpentine */}
      {overflow > 0 && (
        <span
          className="absolute rounded-full bg-garnet-800 px-2 py-0.5 text-[11px] font-semibold text-white"
          style={{ right: 30, top: 44 }}
        >
          +{overflow.toLocaleString()} more in line
        </span>
      )}

      {/* customers */}
      {customers.map((c) => {
        const hidden = c.role === 'waiting' && (c.queueIndex ?? 0) >= visibleCap
        if (hidden) return null
        const { x, y } = posFor(c)
        return (
          <div
            key={c.id}
            className="absolute transition-[left,top,opacity] duration-500 ease-in-out"
            style={{
              left: x - DOT / 2,
              top: y - DOT / 2,
              opacity: c.role === 'departing' ? 0 : 1,
            }}
          >
            <div
              className="mm1-arrive rounded-full ring-2 ring-white"
              style={{
                width: DOT,
                height: DOT,
                backgroundColor: customerColor(c.id),
              }}
            />
          </div>
        )
      })}
    </div>
  )
})
