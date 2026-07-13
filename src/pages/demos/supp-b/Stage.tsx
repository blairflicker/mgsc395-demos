import { memo, useEffect, useRef, useState } from 'react'
import { COLOR_LAMBDA, COLOR_SYSTEM } from './charts'

const DOT = 18 // customer dot diameter, px
const SLOT_GAP = 24 // spacing between queue positions, px

export interface StageCustomer {
  id: number
  role: 'waiting' | 'in-service' | 'departing'
  /** queue index for waiting customers (0 = next up) */
  queueIndex?: number
}

/**
 * The animated queue lane. Customers are absolutely-positioned dots whose
 * `left` transitions between roles: they pop in at their queue slot, slide
 * forward as the line advances, sit in the server ring while in service,
 * and slide off the right edge when they depart.
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
  const queueHeadX = serverX - 64 // queue position 0
  const minX = 24
  const visibleSlots = Math.max(1, Math.floor((queueHeadX - minX) / SLOT_GAP) + 1)
  const exitX = width + 48
  const laneY = 96 // vertical center of the lane

  const overflow = Math.max(0, queueLength - visibleSlots)

  const xFor = (c: StageCustomer): number => {
    if (c.role === 'departing') return exitX
    if (c.role === 'in-service') return serverX
    const i = c.queueIndex ?? 0
    return Math.max(minX, queueHeadX - i * SLOT_GAP)
  }

  return (
    <div
      ref={containerRef}
      className="relative h-40 overflow-hidden rounded-xl border border-stone-200 bg-white"
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

      {/* overflow chip when the line is longer than fits on screen */}
      {overflow > 0 && (
        <span
          className="absolute rounded-full bg-garnet-800 px-2 py-0.5 text-[11px] font-semibold text-white"
          style={{ left: minX - 8, top: laneY - 36 }}
        >
          +{overflow} more
        </span>
      )}

      {/* customers */}
      {customers.map((c) => {
        const hidden = c.role === 'waiting' && (c.queueIndex ?? 0) >= visibleSlots
        if (hidden) return null
        return (
          <div
            key={c.id}
            className="absolute transition-[left,opacity] duration-500 ease-in-out"
            style={{
              left: xFor(c) - DOT / 2,
              top: laneY - DOT / 2,
              opacity: c.role === 'departing' ? 0 : 1,
            }}
          >
            <div
              className="mm1-arrive rounded-full ring-2 ring-white"
              style={{
                width: DOT,
                height: DOT,
                backgroundColor: COLOR_SYSTEM,
              }}
            />
          </div>
        )
      })}
    </div>
  )
})
