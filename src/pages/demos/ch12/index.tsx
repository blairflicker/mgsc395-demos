import { useEffect, useMemo, useState } from 'react'
import DemoHeader from '../../../components/DemoHeader'
import {
  CLASS_COMPANIES,
  WEEKS_PER_YEAR,
  aaiv,
  randomCompanies,
  turnover,
  weeksOfSupply,
  type Company,
  type InventoryItem,
} from '../../../lib/invMetrics'

const MAX_ITEMS = 10

const cloneClass = (): [Company, Company] =>
  [
    { ...CLASS_COMPANIES[0], items: CLASS_COMPANIES[0].items.map((it) => ({ ...it })) },
    { ...CLASS_COMPANIES[1], items: CLASS_COMPANIES[1].items.map((it) => ({ ...it })) },
  ] as [Company, Company]

const CELL_INPUT =
  'w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm ' +
  'hover:border-stone-200 focus:border-garnet-400 focus:bg-white focus:outline-none'

const NAME_INPUT =
  'w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-lg font-semibold text-stone-900 ' +
  'hover:border-stone-200 focus:border-garnet-400 focus:bg-white focus:outline-none'

const fmt1 = (v: number) => v.toFixed(1)
const fmtInt = (v: number) => Math.round(v).toLocaleString('en-US')
const money = (v: number) => `$${fmtInt(v)}`

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

/** Next unused item id with the given prefix. */
function nextItemId(items: { id: string }[], prefix: string): string {
  const used = new Set(items.map((it) => it.id))
  let k = 1
  while (used.has(`${prefix}${k}`)) k++
  return `${prefix}${k}`
}

export default function Ch12InventoryMetrics() {
  const [companies, setCompanies] = useState<[Company, Company]>(cloneClass)
  const [showAnswers, setShowAnswers] = useState(true)

  useEffect(() => {
    document.title = 'Inventory Metrics · MGSC 395'
    return () => {
      document.title = 'MGSC 395 · Interactive Demos'
    }
  }, [])

  const metrics = useMemo(
    () =>
      companies.map((co) => {
        const v = aaiv(co.items)
        return {
          aaiv: v,
          weeks: weeksOfSupply(v, co.cogs),
          turns: turnover(v, co.cogs),
        }
      }),
    [companies],
  )

  /** winners compared at display precision so equal-looking values never bold */
  const best = useMemo(() => {
    const [a, b] = metrics
    const r1 = (v: number | null) => (v === null ? null : Math.round(v * 10))
    const wa = r1(a.weeks)
    const wb = r1(b.weeks)
    const ta = r1(a.turns)
    const tb = r1(b.turns)
    return {
      weeks: [wa !== null && wb !== null && wa < wb, wa !== null && wb !== null && wb < wa],
      turns: [ta !== null && tb !== null && ta > tb, ta !== null && tb !== null && tb > ta],
    }
  }, [metrics])

  // ── company editing ─────────────────────────────────────
  const patchCompany = (ci: number, patch: Partial<Company>) => {
    setCompanies((list) =>
      list.map((co, i) => (i === ci ? { ...co, ...patch } : co)) as [Company, Company],
    )
  }
  const patchItem = (ci: number, id: string, patch: Partial<InventoryItem>) => {
    setCompanies((list) =>
      list.map((co, i) =>
        i === ci
          ? { ...co, items: co.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }
          : co,
      ) as [Company, Company],
    )
  }
  const setUnits = (ci: number, id: string, value: number) => {
    if (!Number.isFinite(value)) return
    patchItem(ci, id, { units: Math.max(0, Math.round(value)) })
  }
  const setValue = (ci: number, id: string, value: number) => {
    if (!Number.isFinite(value)) return
    patchItem(ci, id, { value: Math.max(0, Math.round(value)) })
  }
  const setCogs = (ci: number, value: number) => {
    if (!Number.isFinite(value)) return
    patchCompany(ci, { cogs: Math.max(0, Math.round(value)) })
  }
  const deleteItem = (ci: number, id: string) => {
    setCompanies((list) =>
      list.map((co, i) =>
        i === ci && co.items.length > 1
          ? { ...co, items: co.items.filter((it) => it.id !== id) }
          : co,
      ) as [Company, Company],
    )
  }
  const addItem = (ci: number) => {
    setCompanies((list) =>
      list.map((co, i) =>
        i === ci && co.items.length < MAX_ITEMS
          ? {
              ...co,
              items: [
                ...co.items,
                { id: nextItemId(co.items, `c${ci}n`), name: '', units: 1_000, value: 100 },
              ],
            }
          : co,
      ) as [Company, Company],
    )
  }

  const downloadCsv = (co: Company) => {
    const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
    const lines = [
      'Item,Units,ValuePerUnit',
      ...co.items.map((it) => [esc(it.name), it.units, it.value].join(',')),
    ]
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${co.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'inventory'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── practice toolbar ────────────────────────────────────
  const isClassData =
    companies.length === CLASS_COMPANIES.length &&
    CLASS_COMPANIES.every((c, i) => {
      const r = companies[i]
      return (
        r.name === c.name &&
        r.cogs === c.cogs &&
        r.items.length === c.items.length &&
        c.items.every((it, j) => {
          const s = r.items[j]
          return s.name === it.name && s.units === it.units && s.value === it.value
        })
      )
    })

  const backToClass = () => {
    setCompanies(cloneClass())
  }
  const makeRandom = () => {
    setCompanies(randomCompanies())
    setShowAnswers(false)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DemoHeader
        label="Chapter 12 · Supply Chain Design"
        title="How Fast Does Inventory Move?"
      >
        Two firms selling the same catalog — edit their inventories and
        compare how hard each dollar of stock is working.
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
          onClick={makeRandom}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Create a random problem
        </button>
        <button
          onClick={backToClass}
          disabled={isClassData}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
        >
          Back to class data
        </button>
      </div>

      {/* The two companies */}
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        {companies.map((co, ci) => (
          <div key={ci} className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
            <input
              type="text"
              value={co.name}
              placeholder="(company)"
              onChange={(e) => patchCompany(ci, { name: e.target.value })}
              aria-label={`Company ${ci + 1} name`}
              className={NAME_INPUT}
            />
            <label className="mt-2 mb-3 block">
              <span className="mb-1 block text-xs font-semibold text-stone-500 uppercase">
                Annual sales at cost (COGS)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-sm text-stone-500">$</span>
                <input
                  type="number"
                  min={0}
                  step={100_000}
                  value={co.cogs}
                  onChange={(e) => setCogs(ci, Number(e.target.value))}
                  aria-label={`Annual sales at cost for ${co.name || 'company'}`}
                  className="w-40 rounded border border-stone-300 bg-white px-2 py-1.5 text-sm tabular-nums focus:border-garnet-400 focus:outline-none"
                />
              </span>
            </label>
            <div className="overflow-x-auto">
              <table className="w-full min-w-80 text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                    <th className="py-2 pr-2 font-semibold">Item</th>
                    <th className="w-28 py-2 pr-2 font-semibold">Units on hand</th>
                    <th className="w-24 py-2 pr-2 font-semibold">$ / unit</th>
                    <th className="w-28 py-2 pr-2 text-right font-semibold">
                      Total value
                    </th>
                    <th className="w-9 py-2" aria-label="Delete row" />
                  </tr>
                </thead>
                <tbody>
                  {co.items.map((it) => (
                    <tr key={it.id} className="border-b border-stone-100 last:border-0">
                      <td className="py-1 pr-2">
                        <input
                          type="text"
                          value={it.name}
                          placeholder="(item)"
                          onChange={(e) => patchItem(ci, it.id, { name: e.target.value })}
                          aria-label="Item name"
                          className={CELL_INPUT}
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={it.units}
                          onChange={(e) => setUnits(ci, it.id, Number(e.target.value))}
                          aria-label={`Units on hand of ${it.name || 'item'}`}
                          className={`${CELL_INPUT} tabular-nums`}
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          type="number"
                          min={0}
                          step={10}
                          value={it.value}
                          onChange={(e) => setValue(ci, it.id, Number(e.target.value))}
                          aria-label={`Value per unit of ${it.name || 'item'}`}
                          className={`${CELL_INPUT} tabular-nums`}
                        />
                      </td>
                      <td className="py-1 pr-2 text-right text-stone-700 tabular-nums">
                        {showAnswers ? money(it.units * it.value) : '—'}
                      </td>
                      <td className="py-1">
                        <button
                          onClick={() => deleteItem(ci, it.id)}
                          disabled={co.items.length <= 1}
                          title={
                            co.items.length <= 1
                              ? 'Keep at least 1 item'
                              : `Delete ${it.name || 'this item'}`
                          }
                          aria-label={`Delete ${it.name || 'item'}`}
                          className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-red-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-stone-400"
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-stone-300 font-semibold text-stone-900">
                    <td className="py-2 pr-2" colSpan={3}>
                      Average aggregate inventory value
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {showAnswers ? money(metrics[ci].aaiv) : '—'}
                    </td>
                    <td className="py-2" />
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => addItem(ci)}
                disabled={co.items.length >= MAX_ITEMS}
                className="rounded-lg border border-dashed border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40"
              >
                + Add row
              </button>
              <button
                onClick={() => downloadCsv(co)}
                disabled={co.items.length === 0}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
              >
                Download CSV
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* The metrics, side by side */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold text-stone-900">
          The inventory metrics
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-130 text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                <th className="py-2 pr-3 font-semibold">Metric</th>
                {companies.map((co, ci) => (
                  <th key={ci} className="w-1/3 py-2 pr-3 text-right font-semibold">
                    {co.name || `Company ${ci + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              <tr className="border-b border-stone-100">
                <td className="py-2 pr-3 font-medium text-stone-800">
                  Average aggregate inventory value
                </td>
                {metrics.map((m, ci) => (
                  <td key={ci} className="py-2 pr-3 text-right align-top text-stone-700">
                    {showAnswers ? (
                      <>
                        <div>{money(m.aaiv)}</div>
                        <div className="text-xs text-stone-500">
                          {companies[ci].items
                            .map((it) => fmtInt(it.units * it.value))
                            .join(' + ')}{' '}
                          = {money(m.aaiv)}
                        </div>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2 pr-3 font-medium text-stone-800">
                  Weeks of supply
                </td>
                {metrics.map((m, ci) => (
                  <td key={ci} className="py-2 pr-3 text-right align-top">
                    {showAnswers && m.weeks !== null ? (
                      <>
                        <div
                          className={
                            best.weeks[ci]
                              ? 'font-bold text-stone-900'
                              : 'text-stone-700'
                          }
                        >
                          {fmt1(m.weeks)} weeks
                        </div>
                        <div className="text-xs font-normal text-stone-500">
                          {money(m.aaiv)} / ({money(companies[ci].cogs)} /{' '}
                          {WEEKS_PER_YEAR}) = {fmt1(m.weeks)} weeks
                        </div>
                      </>
                    ) : (
                      <span className="text-stone-700">—</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-3 font-medium text-stone-800">
                  Inventory turnover
                </td>
                {metrics.map((m, ci) => (
                  <td key={ci} className="py-2 pr-3 text-right align-top">
                    {showAnswers && m.turns !== null ? (
                      <>
                        <div
                          className={
                            best.turns[ci]
                              ? 'font-bold text-stone-900'
                              : 'text-stone-700'
                          }
                        >
                          {fmt1(m.turns)} turns/yr
                        </div>
                        <div className="text-xs font-normal text-stone-500">
                          {money(companies[ci].cogs)} / {money(m.aaiv)} ={' '}
                          {fmt1(m.turns)} turns/yr
                        </div>
                      </>
                    ) : (
                      <span className="text-stone-700">—</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
