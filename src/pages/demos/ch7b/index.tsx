import { useEffect, useRef, useState } from 'react'
import DemoHeader from '../../../components/DemoHeader'
import {
  BOTTLENECK_PLAN,
  CAPACITY,
  FULL_DEMAND_PLAN,
  PRODUCTS,
  PRODUCT_INFO,
  TIME,
  TRADITIONAL_PLAN,
  WORKERS,
  ZERO_PLAN,
  binding,
  financials,
  maxFeasible,
  workerTotal,
  type Plan,
  type ProductId,
} from '../../../lib/diablo'

/** validated chart palette — one color per product */
const PRODUCT_COLOR: Record<ProductId, string> = {
  A: '#1d4ed8',
  B: '#a52547',
  C: '#0d9488',
  D: '#b45309',
}

const money = (v: number) =>
  v < 0 ? `−$${Math.abs(v).toLocaleString('en-US')}` : `$${v.toLocaleString('en-US')}`

const num = (v: number) => v.toLocaleString('en-US')

const listNames = (names: string[]) =>
  names.length <= 2
    ? names.join(' and ')
    : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`

/** a pop-up explaining why the plan couldn't take as many of a product as asked */
interface Notice {
  product: ProductId
  title: string
  body: string
}

/**
 * Explain the constraint that stopped product p short of `wanted` units.
 * `before` is what the plan held, `after` is where it landed (the cap).
 */
function explain(plan: Plan, p: ProductId, wanted: number, before: number, after: number): Notice {
  const b = binding(plan, p)
  const asked = wanted - before
  const landed =
    after > before
      ? ` The plan moved up to ${after} instead.`
      : ''

  if (b.kind === 'demand') {
    return {
      product: p,
      title: `Demand for Product ${p} is ${b.demand} a week`,
      body:
        `Customers will buy at most ${b.demand} units of Product ${p} each week, and Diablo's policy ` +
        `is to make only what it can sell. Units beyond that would sit in inventory, so the plan ` +
        `can't go past ${b.demand}.${landed} If the workers still have minutes left, spend them on another product.`,
    }
  }

  const names = b.workers.map((w) => w.worker)
  const detail = b.workers
    .map((w) => {
      const room = Math.floor(w.left / w.perUnit)
      const left =
        w.left === 0
          ? `has no minutes left this week`
          : `has only ${num(w.left)} of ${num(CAPACITY)} minutes left this week`
      const fits =
        room === 0
          ? `not enough for even one more`
          : `enough for ${room} more, not the ${asked} you asked for`
      return `Every unit of Product ${p} needs ${w.perUnit} minutes from ${w.worker}, who ${left} — ${fits}.`
    })
    .join(' ')
  const who = names.length === 1 ? `${names[0]} is` : `${listNames(names)} are`
  return {
    product: p,
    title: `${who} out of time`,
    body:
      `${detail}${landed} ${listNames(names)} ${names.length === 1 ? 'is' : 'are'} the binding ` +
      `constraint on this plan: the only way to make more ${p} is to give up units of another ` +
      `product that ${names.length === 1 ? `uses ${names[0]}'s` : 'use their'} time.`,
  }
}

function NoticePopover({
  notice,
  align,
  onClose,
}: {
  notice: Notice
  align: 'left' | 'right'
  onClose: () => void
}) {
  return (
    <div
      role="alert"
      data-notice
      className={`absolute top-full z-20 mt-2 w-80 max-w-[calc(100vw-3rem)] rounded-lg border border-garnet-300 bg-white p-3 text-left shadow-lg ${align === 'right' ? 'right-0' : 'left-0'}`}
    >
      <span
        aria-hidden
        className={`absolute -top-1.5 h-3 w-3 rotate-45 border-t border-l border-garnet-300 bg-white ${align === 'right' ? 'right-4' : 'left-4'}`}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-garnet-900">{notice.title}</div>
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="-mt-0.5 -mr-1 h-6 w-6 shrink-0 rounded text-base leading-none text-stone-400 hover:bg-stone-100 hover:text-stone-700"
        >
          ×
        </button>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-stone-700">{notice.body}</p>
    </div>
  )
}

export default function Ch7ConstraintManagement() {
  const [plan, setPlan] = useState<Plan>({ ...ZERO_PLAN })
  const [showAnswers, setShowAnswers] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    document.title = 'Constraint Management · MGSC 395'
    return () => {
      document.title = 'MGSC 395 · Interactive Demos'
    }
  }, [])

  // the pop-up goes away on Escape, on a click anywhere outside it, or after a while
  useEffect(() => {
    if (!notice) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotice(null)
    }
    const onDown = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest('[data-notice]')) setNotice(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 15000)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
      window.clearTimeout(noticeTimer.current)
    }
  }, [notice])

  const loadPlan = (next: Plan) => {
    setNotice(null)
    setPlan({ ...next })
  }

  const setProduct = (p: ProductId, value: number) => {
    if (!Number.isFinite(value)) return
    const wanted = Math.max(0, Math.round(value))
    const cap = maxFeasible(plan, p)
    const next = Math.min(cap, wanted)
    setNotice(wanted > cap ? explain(plan, p, wanted, plan[p], next) : null)
    setPlan({ ...plan, [p]: next })
  }

  const fin = financials(plan)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DemoHeader label="Chapter 7B · Constraint Management" title="The Diablo Problem">
        Diablo Electronics cannot meet all of its demand — pick a production
        plan and watch where the workers&rsquo; minutes go.
      </DemoHeader>

      {/* Practice toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-garnet-200 bg-garnet-50/50 px-4 py-3">
        <span className="mr-1 text-sm font-semibold text-garnet-900">
          Practice mode
        </span>
        <button
          onClick={() => setShowAnswers((v) => !v)}
          className="rounded-lg bg-garnet-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-garnet-700"
        >
          {showAnswers ? 'Hide answers' : 'Show answers'}
        </button>
        <button
          onClick={() => loadPlan(ZERO_PLAN)}
          disabled={fin.units === 0}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
        >
          Reset plan
        </button>
      </div>

      {/* Problem data */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-1 text-lg font-semibold text-stone-900">The data</h2>
        <p className="mb-3 text-sm text-stone-600">
          Every worker has 2,400 minutes a week — 8 hours a day, 5 days, no
          overtime.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full max-w-lg min-w-96 text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                <th className="py-1.5 pr-3 font-semibold" />
                {PRODUCTS.map((p) => (
                  <th key={p} className="py-1.5 pr-3 text-right font-semibold">
                    <span className="flex items-center justify-end gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: PRODUCT_COLOR[p] }}
                      />
                      {p}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              <tr>
                <td
                  colSpan={5}
                  className="pt-2 pb-1 text-xs font-semibold text-stone-400 uppercase"
                >
                  Minutes per unit
                </td>
              </tr>
              {WORKERS.map((w) => (
                <tr key={w} className="border-b border-stone-100">
                  <td className="py-1 pr-3 text-stone-700">{w}</td>
                  {PRODUCTS.map((p) => (
                    <td key={p} className="py-1 pr-3 text-right text-stone-700">
                      {TIME[w][p] > 0 ? TIME[w][p] : '—'}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td
                  colSpan={5}
                  className="pt-6 pb-1 text-xs font-semibold text-stone-400 uppercase"
                >
                  Dollars per unit
                </td>
              </tr>
              {(
                [
                  ['Price', (p: ProductId) => PRODUCT_INFO[p].price],
                  ['Materials', (p: ProductId) => PRODUCT_INFO[p].materials],
                  ['Margin', (p: ProductId) => PRODUCT_INFO[p].margin],
                ] as const
              ).map(([label, get]) => (
                <tr key={label} className="border-b border-stone-100">
                  <td className="py-1 pr-3 text-stone-700">{label}</td>
                  {PRODUCTS.map((p) => (
                    <td key={p} className="py-1 pr-3 text-right text-stone-700">
                      ${get(p)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td
                  colSpan={5}
                  className="pt-6 pb-1 text-xs font-semibold text-stone-400 uppercase"
                >
                  Units per week
                </td>
              </tr>
              <tr>
                <td className="py-1 pr-3 text-stone-700">Demand</td>
                {PRODUCTS.map((p) => (
                  <td key={p} className="py-1 pr-3 text-right text-stone-700">
                    {PRODUCT_INFO[p].demand}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      {/* The plan */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold text-stone-900">Your plan</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PRODUCTS.map((p) => {
            const info = PRODUCT_INFO[p]
            const cap = maxFeasible(plan, p)
            return (
              <div key={p} className="relative rounded-lg border border-stone-200 p-3">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-800">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: PRODUCT_COLOR[p] }}
                  />
                  Product {p}
                </div>
                <div className="mt-0.5 mb-2 text-xs text-stone-500 tabular-nums">
                  ${info.margin} margin/unit · demand ≤ {info.demand}/wk
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setProduct(p, plan[p] - 10)}
                    disabled={plan[p] === 0}
                    aria-label={`Make 10 fewer of product ${p}`}
                    className="h-8 w-8 rounded-lg border border-stone-300 bg-white text-base font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={info.demand}
                    step={10}
                    value={plan[p]}
                    onChange={(e) => setProduct(p, Number(e.target.value))}
                    aria-label={`Units of product ${p} per week`}
                    className="h-8 w-16 rounded-lg border border-stone-200 bg-white text-center text-sm tabular-nums focus:border-garnet-400 focus:outline-none"
                  />
                  <button
                    onClick={() => setProduct(p, plan[p] + 10)}
                    aria-disabled={plan[p] >= cap}
                    aria-label={`Make 10 more of product ${p}`}
                    className={`h-8 w-8 rounded-lg border border-stone-300 bg-white text-base font-medium hover:bg-stone-50 ${plan[p] >= cap ? 'text-stone-400' : 'text-stone-700'}`}
                  >
                    +
                  </button>
                  <span className="ml-1 text-xs text-stone-500">units</span>
                  {notice?.product === p && (
                    <NoticePopover
                      notice={notice}
                      align={p === 'D' ? 'right' : 'left'}
                      onClose={() => setNotice(null)}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* the P&L, exactly as the slides compute it */}
        <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-2 border-t border-stone-100 pt-3 tabular-nums">
          {(
            [
              ['Revenue', fin.revenue, ''],
              ['Materials', -fin.materials, '−'],
              ['Labor', -fin.labor, '−'],
              ['Overhead', -fin.overhead, '−'],
            ] as const
          ).map(([label, value, op]) => (
            <span key={label} className="flex items-end gap-3">
              {op && <span className="pb-0.5 text-lg text-stone-400">{op}</span>}
              <span>
                <span className="block text-xs font-semibold text-stone-500 uppercase">
                  {label}
                </span>
                <span className="text-lg text-stone-700">
                  {money(Math.abs(value))}
                </span>
              </span>
            </span>
          ))}
          <span className="pb-0.5 text-lg text-stone-400">=</span>
          <span>
            <span className="block text-xs font-semibold text-stone-500 uppercase">
              Profit
            </span>
            <span
              className={`text-lg font-bold ${fin.profit < 0 ? 'text-red-700' : 'text-stone-900'}`}
            >
              {money(fin.profit)}
            </span>
          </span>
          <span className="ml-auto pb-0.5 text-sm text-stone-500">
            {fin.units.toLocaleString('en-US')} units/wk
          </span>
        </div>
      </div>

      {/* Worker time */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-stone-900">
            The workers&rsquo; week
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
            {PRODUCTS.map((p) => (
              <span key={p} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: PRODUCT_COLOR[p] }}
                />
                Product {p}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-2.5">
          {WORKERS.map((w) => {
            const total = workerTotal(plan, w)
            const left = CAPACITY - total
            return (
              <div
                key={w}
                className="grid grid-cols-[4.5rem_1fr_11rem] items-center gap-3"
              >
                <span className="text-sm font-medium text-stone-800">{w}</span>
                <div className="flex h-4 overflow-hidden rounded bg-stone-100">
                  {PRODUCTS.map((p) => {
                    const min = TIME[w][p] * plan[p]
                    if (min === 0) return null
                    return (
                      <div
                        key={p}
                        title={`${w} — Product ${p}: ${min.toLocaleString('en-US')} min`}
                        style={{
                          width: `${(min / CAPACITY) * 100}%`,
                          backgroundColor: PRODUCT_COLOR[p],
                        }}
                      />
                    )
                  })}
                </div>
                <span className="text-right text-xs text-stone-500 tabular-nums">
                  {total.toLocaleString('en-US')} / {CAPACITY.toLocaleString('en-US')} min ·{' '}
                  <span className={left === 0 ? 'font-bold text-garnet-800' : ''}>
                    {left.toLocaleString('en-US')} left
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* The answer */}
      {showAnswers && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-lg font-semibold text-stone-900">The answer</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <h3 className="mb-1.5 text-sm font-semibold text-stone-800">
                Where is the bottleneck?
              </h3>
              <table className="w-full max-w-xs text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                    <th className="py-1.5 pr-3 font-semibold">Worker</th>
                    <th className="py-1.5 text-right font-semibold">
                      Load at full demand
                    </th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {WORKERS.map((w) => {
                    const load = workerTotal(FULL_DEMAND_PLAN, w)
                    const over = load > CAPACITY
                    return (
                      <tr key={w} className="border-b border-stone-100 last:border-0">
                        <td
                          className={`py-1 pr-3 ${over ? 'font-bold text-garnet-800' : 'text-stone-700'}`}
                        >
                          {w}
                        </td>
                        <td
                          className={`py-1 text-right ${over ? 'font-bold text-garnet-800' : 'text-stone-700'}`}
                        >
                          {load.toLocaleString('en-US')} min
                          {over && ` > ${CAPACITY.toLocaleString('en-US')}`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="mb-1.5 text-sm font-semibold text-stone-800">
                Margin per minute of Xavier&rsquo;s time
              </h3>
              <table className="w-full max-w-sm text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                    <th className="py-1.5 pr-3 font-semibold">Product</th>
                    <th className="py-1.5 pr-3 text-right font-semibold">Margin</th>
                    <th className="py-1.5 pr-3 text-right font-semibold">
                      Min at Xavier
                    </th>
                    <th className="py-1.5 text-right font-semibold">$ / min</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {PRODUCTS.map((p) => {
                    const t = TIME.Xavier[p]
                    return (
                      <tr key={p} className="border-b border-stone-100 last:border-0">
                        <td className="py-1 pr-3 text-stone-700">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: PRODUCT_COLOR[p] }}
                            />
                            {p}
                          </span>
                        </td>
                        <td className="py-1 pr-3 text-right text-stone-700">
                          ${PRODUCT_INFO[p].margin}
                        </td>
                        <td className="py-1 pr-3 text-right text-stone-700">{t}</td>
                        <td className="py-1 text-right text-stone-700">
                          {t > 0
                            ? `$${(PRODUCT_INFO[p].margin / t).toFixed(2)}`
                            : 'free — make it first'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  key: 'traditional',
                  name: 'Traditional method',
                  rank: 'rank by margin per unit: B → A → C → D',
                  plan: TRADITIONAL_PLAN,
                },
                {
                  key: 'bottleneck',
                  name: 'Bottleneck method',
                  rank: 'rank by margin per Xavier-minute: D → C → A → B',
                  plan: BOTTLENECK_PLAN,
                },
              ] as const
            ).map((m) => {
              const f = financials(m.plan)
              const isBest = m.key === 'bottleneck'
              return (
                <div
                  key={m.key}
                  className={`rounded-lg border p-3 ${isBest ? 'border-garnet-300 bg-garnet-50/40' : 'border-stone-200'}`}
                >
                  <div className="text-sm font-semibold text-stone-900">{m.name}</div>
                  <div className="mb-2 text-xs text-stone-500">{m.rank}</div>
                  <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-700 tabular-nums">
                    {PRODUCTS.map((p) => (
                      <span key={p}>
                        {p}: <span className="font-medium">{m.plan[p]}</span>
                      </span>
                    ))}
                  </div>
                  <div className="mb-2 text-sm text-stone-700 tabular-nums">
                    {f.units} units ·{' '}
                    <span className="font-bold text-stone-900">
                      {money(f.profit)} profit
                    </span>
                  </div>
                  <button
                    onClick={() => loadPlan(m.plan)}
                    className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
                  >
                    Load this plan
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
