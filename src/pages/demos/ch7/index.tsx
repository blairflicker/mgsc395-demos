import { useEffect, useMemo, useState } from 'react'
import DemoHeader from '../../../components/DemoHeader'
import {
  ST_JOHNS,
  computeCpm,
  descendantsOf,
  nextActivityId,
  randomProject,
  type ActivityInput,
  type LayoutPoint,
} from '../../../lib/cpm'
import { Network } from './Network'
import { Gantt } from './Gantt'
import { COLOR_CRITICAL, COLOR_MUTED } from './palette'
import { downloadWorksheet } from './worksheet'

const MIN_DUR = 1
const MAX_DUR = 52

const CLASS_PLAN = computeCpm(ST_JOHNS)

/** an activity row in the editor; hiding removes it from the NETWORK
 *  DIAGRAM only — every calculation (paths, schedule, Gantt) still uses
 *  the full project */
interface ActivityRow extends ActivityInput {
  hidden?: boolean
}

const cloneClass = (): ActivityRow[] =>
  ST_JOHNS.map((a) => ({ ...a, predecessors: [...a.predecessors] }))

function pathLabel(ids: string[]): string {
  return ['Start', ...ids, 'Finish'].join(' → ')
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17.94 17.94A10.5 10.5 0 0 1 12 19c-7 0-11-7-11-7a19.8 19.8 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A10.9 10.9 0 0 1 12 5c7 0 11 7 11 7a19.8 19.8 0 0 1-3.22 4.31" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

const CELL_INPUT =
  'w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm ' +
  'hover:border-stone-200 focus:border-garnet-400 focus:bg-white focus:outline-none'

export default function Ch7ProjectManagement() {
  const [rows, setRows] = useState<ActivityRow[]>(cloneClass)
  const [predDrafts, setPredDrafts] = useState<Record<string, string>>({})
  const [showAnswers, setShowAnswers] = useState(true)
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [nodeOverrides, setNodeOverrides] = useState<Record<string, LayoutPoint>>({})

  useEffect(() => {
    document.title = 'Project Management · MGSC 395'
    return () => {
      document.title = 'MGSC 395 · Interactive Demos'
    }
  }, [])

  /** the full project — hiding rows never changes the analysis */
  const inputs = useMemo<ActivityInput[]>(
    () =>
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        duration: r.duration,
        predecessors: [...r.predecessors],
      })),
    [rows],
  )

  const schedule = useMemo(() => computeCpm(inputs), [inputs])

  const hiddenIds = useMemo(
    () => new Set(rows.filter((r) => r.hidden).map((r) => r.id)),
    [rows],
  )

  // ── row editing ─────────────────────────────────────────
  const patchRow = (id: string, patch: Partial<ActivityRow>) => {
    setRows((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const setDuration = (id: string, value: number) => {
    if (!Number.isFinite(value)) return
    patchRow(id, {
      duration: Math.min(MAX_DUR, Math.max(MIN_DUR, Math.round(value))),
    })
  }

  /** parse a typed predecessor list; returns null when any token is not an
   *  existing letter, is the row itself, or would create a cycle */
  const parsePreds = (id: string, text: string): string[] | null => {
    const tokens = [...new Set(
      text.toUpperCase().split(/[,\s]+/).filter(Boolean),
    )]
    const blocked = descendantsOf(rows, id)
    for (const t of tokens) {
      if (t === id) return null
      if (!rows.some((r) => r.id === t)) return null
      if (blocked.has(t)) return null
    }
    return tokens.sort()
  }

  const onPredsChange = (id: string, text: string) => {
    setPredDrafts((d) => ({ ...d, [id]: text }))
    const parsed = parsePreds(id, text)
    if (parsed) patchRow(id, { predecessors: parsed })
  }

  const onPredsBlur = (id: string) => {
    setPredDrafts((d) => {
      const { [id]: _, ...rest } = d
      return rest
    })
  }

  const toggleHidden = (id: string) => {
    setRows((list) => list.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r)))
  }

  const deleteRow = (id: string) => {
    setRows((list) =>
      list
        .filter((r) => r.id !== id)
        .map((r) => ({ ...r, predecessors: r.predecessors.filter((p) => p !== id) })),
    )
  }

  const addRow = () => {
    setRows((list) => {
      const id = nextActivityId(list)
      if (!id) return list
      return [...list, { id, name: '', predecessors: [], duration: 5 }]
    })
  }

  const showAllRows = () => {
    setRows((list) => list.map((r) => ({ ...r, hidden: false })))
  }

  const hideAllRows = () => {
    setRows((list) => list.map((r) => ({ ...r, hidden: true })))
  }

  const pathKey = (ids: string[]) => ids.join('-')

  const togglePath = (key: string) => {
    setSelectedPaths((s) => {
      const next = new Set(s)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  /** union of activity ids on the currently selected (and existing) paths */
  const selectedIds = useMemo(() => {
    const out = new Set<string>()
    for (const p of schedule.paths) {
      if (selectedPaths.has(pathKey(p.ids))) for (const id of p.ids) out.add(id)
    }
    return out
  }, [schedule, selectedPaths])

  const showOnlySelected = () => {
    if (selectedIds.size === 0) return
    setRows((list) =>
      list.map((r) => ({ ...r, hidden: !selectedIds.has(r.id) })),
    )
  }

  /** highlight for the activities table, driven by selected paths */
  const rowHighlight = useMemo(() => {
    const out: Record<string, 'critical' | 'plain'> = {}
    for (const p of schedule.paths) {
      if (!selectedPaths.has(pathKey(p.ids))) continue
      for (const id of p.ids) {
        if (p.critical) out[id] = 'critical'
        else out[id] ??= 'plain'
      }
    }
    return out
  }, [schedule, selectedPaths])

  const backToClass = () => {
    setRows(cloneClass())
    setPredDrafts({})
    setSelectedPaths(new Set())
    setNodeOverrides({})
  }

  const makeRandom = () => {
    setRows(randomProject())
    setPredDrafts({})
    setSelectedPaths(new Set())
    setNodeOverrides({})
    setShowAnswers(false)
  }

  const moveNode = (id: string, pos: LayoutPoint) => {
    setNodeOverrides((o) => ({ ...o, [id]: pos }))
  }

  const anyHidden = rows.some((r) => r.hidden)
  // hiding is a view setting, so it doesn't disqualify the class plan
  const isClassPlan =
    rows.length === ST_JOHNS.length &&
    ST_JOHNS.every((c) => {
      const r = rows.find((x) => x.id === c.id)
      return (
        r !== undefined &&
        r.name === c.name &&
        r.duration === c.duration &&
        [...r.predecessors].sort().join() === [...c.predecessors].sort().join()
      )
    })

  const maxPathTime = Math.max(...schedule.paths.map((p) => p.duration), 1)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DemoHeader
        label="Chapter 7 · Project Management"
        title="The Critical Path, Live"
      >
        The St. John&rsquo;s Hospital project from class — but editable.
        Click any cell in the table to change it and watch the forward pass,
        backward pass, slack, and the critical path recompute instantly. Or
        hide the answers, generate a random project, and fill in the boxes
        yourself.
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
          disabled={isClassPlan}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
        >
          Back to class project
        </button>
        {!showAnswers && (
          <span className="basis-full text-xs text-garnet-900/80">
            Answers hidden — work the problem yourself (the worksheet PDF
            matches this exact problem), then reveal to check.
          </span>
        )}
      </div>

      {/* Activity table editor */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-stone-900">
            The activities
          </h2>
          <p className="max-w-3xl text-sm text-stone-600">
            Click a cell and type — descriptions, durations, and predecessors
            (letters separated by commas). The eye hides an activity from the
            network diagram (calculations keep it); the{' '}
            <span
              className="mx-0.5 inline-block h-2 w-2 rounded-full align-middle"
              style={{ backgroundColor: COLOR_CRITICAL }}
            />{' '}
            dot marks the critical path.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-130 text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                <th className="w-9 py-2" aria-label="Visibility" />
                <th className="w-16 py-2 pr-2 font-semibold">Activity</th>
                <th className="py-2 pr-2 font-semibold">Description</th>
                <th className="w-28 py-2 pr-2 font-semibold">Duration (wks)</th>
                <th className="w-40 py-2 pr-2 font-semibold">Predecessor(s)</th>
                <th className="w-9 py-2" aria-label="Delete row" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const scheduled = schedule.byId[r.id]
                const critical = showAnswers && !!scheduled?.critical
                const draft = predDrafts[r.id]
                const predText = draft ?? r.predecessors.join(', ')
                const predInvalid =
                  draft !== undefined && parsePreds(r.id, draft) === null
                const highlight = showAnswers ? rowHighlight[r.id] : undefined
                return (
                  <tr
                    key={r.id}
                    className={[
                      'border-b border-stone-100 last:border-0',
                      r.hidden ? 'opacity-45' : '',
                      highlight === 'critical'
                        ? 'bg-garnet-50/60'
                        : highlight === 'plain'
                          ? 'bg-stone-100'
                          : '',
                    ].join(' ')}
                  >
                    <td className="py-1">
                      <button
                        onClick={() => toggleHidden(r.id)}
                        title={
                          r.hidden
                            ? `Show ${r.id} in the network diagram again`
                            : `Hide ${r.id} from the network diagram (calculations keep it)`
                        }
                        aria-label={r.hidden ? `Show activity ${r.id}` : `Hide activity ${r.id}`}
                        className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                      >
                        <EyeIcon open={!r.hidden} />
                      </button>
                    </td>
                    <td className="py-1 pr-2">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor: critical ? COLOR_CRITICAL : 'white',
                            border: critical ? 'none' : `1.5px solid ${COLOR_MUTED}`,
                          }}
                        />
                        <span className="font-semibold text-stone-800">{r.id}</span>
                      </span>
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="text"
                        value={r.name}
                        placeholder="(description)"
                        onChange={(e) => patchRow(r.id, { name: e.target.value })}
                        aria-label={`Description for activity ${r.id}`}
                        className={CELL_INPUT}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        min={MIN_DUR}
                        max={MAX_DUR}
                        value={r.duration}
                        onChange={(e) => setDuration(r.id, Number(e.target.value))}
                        aria-label={`Duration for activity ${r.id}, weeks`}
                        className={`${CELL_INPUT} tabular-nums`}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="text"
                        value={predText}
                        placeholder="— (starts at Start)"
                        onChange={(e) => onPredsChange(r.id, e.target.value)}
                        onBlur={() => onPredsBlur(r.id)}
                        title={
                          predInvalid
                            ? 'Only existing letters, no cycles — e.g. "B, D"'
                            : 'Letters separated by commas, e.g. "B, D"'
                        }
                        aria-label={`Predecessors for activity ${r.id}`}
                        aria-invalid={predInvalid}
                        className={[
                          CELL_INPUT,
                          predInvalid
                            ? 'border-red-400 bg-red-50 focus:border-red-500'
                            : '',
                        ].join(' ')}
                      />
                    </td>
                    <td className="py-1">
                      <button
                        onClick={() => deleteRow(r.id)}
                        title={`Delete row ${r.id} permanently (use the eye to hide instead)`}
                        aria-label={`Delete activity ${r.id}`}
                        className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-red-700"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={addRow}
              disabled={rows.length >= 26}
              className="rounded-lg border border-dashed border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40"
            >
              + Add row
            </button>
            <button
              onClick={showAllRows}
              disabled={!anyHidden}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
            >
              Show all
            </button>
            <button
              onClick={hideAllRows}
              disabled={rows.length === 0}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
            >
              Hide all
            </button>
            <button
              onClick={showOnlySelected}
              disabled={selectedIds.size === 0}
              title={
                selectedIds.size === 0
                  ? 'Click one or more paths below first'
                  : 'Show only the activities on the selected paths in the network diagram'
              }
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
            >
              Show only those selected
            </button>
          </div>
          {anyHidden && (
            <span className="text-xs text-stone-500">
              {rows.filter((r) => r.hidden).length} hidden from the network
              diagram — calculations still include them.
            </span>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mb-6 rounded-xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">
          No activities yet — add a row to begin.
        </div>
      ) : (
        <>
          {/* Paths — listed first: you can only spot the critical path after
              writing down every path */}
          {showAnswers && (
            <div className="mb-4 rounded-xl border border-stone-200 bg-white p-5">
              <h2 className="mb-1 text-lg font-semibold text-stone-900">
                Every path from Start to Finish
              </h2>
              <p className="mb-3 max-w-3xl text-sm text-stone-600">
                First, list every path and add up its activity times. The
                slowest path sets the project duration — that is the critical
                path. Click a path to light up its activities in the table
                above.
              </p>
              <div className="overflow-x-auto">
                <div className="min-w-140 space-y-1">
                  {schedule.paths.map((p) => {
                    const key = pathKey(p.ids)
                    const selected = selectedPaths.has(key)
                    const mathLabel = p.ids
                      .map((id) => schedule.byId[id].duration)
                      .join(' + ')
                    return (
                      <button
                        key={key}
                        onClick={() => togglePath(key)}
                        aria-pressed={selected}
                        className={[
                          'flex w-full items-center gap-4 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                          selected
                            ? p.critical
                              ? 'bg-garnet-50/80'
                              : 'bg-stone-100'
                            : 'hover:bg-stone-50',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'w-32 shrink-0',
                            p.critical
                              ? 'font-semibold text-stone-900'
                              : 'text-stone-600',
                          ].join(' ')}
                        >
                          {p.ids.join('–')}
                        </span>
                        <span className="whitespace-nowrap text-stone-600 tabular-nums">
                          {mathLabel} ={' '}
                          <strong className="text-stone-900">{p.duration}</strong>{' '}
                          wks
                        </span>
                        <span className="w-16 shrink-0 text-left">
                          {p.critical && (
                            <span className="rounded-full bg-garnet-100 px-2 py-0.5 text-xs font-medium text-garnet-800">
                              critical
                            </span>
                          )}
                        </span>
                        <span className="min-w-24 flex-1">
                          <span className="block h-2 w-full rounded-full bg-stone-100">
                            <span
                              className="block h-2 rounded-full"
                              style={{
                                width: `${(p.duration / maxPathTime) * 100}%`,
                                backgroundColor: p.critical
                                  ? COLOR_CRITICAL
                                  : COLOR_MUTED,
                              }}
                            />
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Headline result */}
          <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
              <div>
                <div className="text-sm font-medium text-stone-600">
                  Project duration
                </div>
                <div className="text-4xl font-bold text-stone-900 tabular-nums">
                  {showAnswers ? schedule.projectDuration : '?'}
                  <span className="ml-1.5 text-lg font-normal text-stone-500">
                    weeks
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-stone-600">
                  Critical path{showAnswers && schedule.criticalPaths.length > 1 ? 's' : ''}
                </div>
                {showAnswers ? (
                  <>
                    {schedule.criticalPaths.map((p) => (
                      <div
                        key={p.ids.join('-')}
                        className="text-base font-semibold text-garnet-800"
                      >
                        {pathLabel(p.ids)}
                      </div>
                    ))}
                    {!isClassPlan && (
                      <div className="mt-1 text-xs text-stone-500">
                        Class plan: {CLASS_PLAN.projectDuration} weeks via{' '}
                        {pathLabel(CLASS_PLAN.criticalPaths[0].ids)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-base text-stone-400">
                    hidden — work it out, then hit &ldquo;Show answers&rdquo;
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Network diagram */}
          <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="mb-3 text-lg font-semibold text-stone-900">
              The project network
            </h2>
            <Network
              schedule={schedule}
              hideAnswers={!showAnswers}
              hiddenIds={hiddenIds}
              overrides={nodeOverrides}
              onMove={moveNode}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
              <button
                onClick={() => void downloadWorksheet(inputs, { positions: nodeOverrides })}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Create worksheet (PDF)
              </button>
              <button
                onClick={() =>
                  void downloadWorksheet(inputs, {
                    positions: nodeOverrides,
                    solution: true,
                  })
                }
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Create solutions (PDF)
              </button>
              <span className="text-xs text-stone-500">
                Both use this exact problem — and your arrangement, if you
                dragged the boxes.
              </span>
            </div>
          </div>

          {/* Schedule table */}
          <div className="mb-6 overflow-x-auto rounded-xl border border-stone-200 bg-white p-5">
            <ScheduleTable schedule={schedule} showAnswers={showAnswers} />
          </div>

          {/* Gantt */}
          {showAnswers && (
            <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5">
              <h2 className="mb-1 text-lg font-semibold text-stone-900">
                Gantt chart — grab a bar and feel the slack
              </h2>
              <p className="mb-3 max-w-3xl text-sm text-stone-600">
                Every bar starts at its Earliest Start Time. Bars with slack
                can be dragged anywhere inside their whisker — early, late,
                anywhere between EST and LFT — without delaying the project.
                The connectors never break: drag a bar into a neighbor and it
                shoves that neighbor along, until the whole chain runs out of
                slack. Critical bars can&rsquo;t move at all; that is what
                zero slack means.
              </p>
              <Gantt schedule={schedule} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ScheduleTable({
  schedule,
  showAnswers,
}: {
  schedule: ReturnType<typeof computeCpm>
  showAnswers: boolean
}) {
  return (
    <>
      <h2 className="mb-1 text-lg font-semibold text-stone-900">
        The full schedule
      </h2>
      <table className="w-full min-w-105 text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
            <th className="py-2 pr-3 font-semibold">Activity</th>
            <th className="py-2 pr-3 font-semibold">Preds</th>
            <th className="py-2 pr-3 text-right font-semibold">Dur</th>
            <th className="py-2 pr-3 text-right font-semibold">EST</th>
            <th className="py-2 pr-3 text-right font-semibold">EFT</th>
            <th className="py-2 pr-3 text-right font-semibold">LST</th>
            <th className="py-2 pr-3 text-right font-semibold">LFT</th>
            <th className="py-2 pr-3 text-right font-semibold">Slack</th>
            <th className="py-2 font-semibold" aria-label="Critical flag" />
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {schedule.activities.map((a) => (
            <tr
              key={a.id}
              className={[
                'border-b border-stone-100 last:border-0',
                showAnswers && a.critical ? 'bg-garnet-50/60' : '',
              ].join(' ')}
            >
              <td className="max-w-44 py-1.5 pr-3">
                <span className="font-semibold text-stone-800">{a.id}</span>{' '}
                {a.name && (
                  <span className="text-stone-500" title={a.name}>
                    {a.name.length > 26 ? a.name.slice(0, 25) + '…' : a.name}
                  </span>
                )}
              </td>
              <td className="py-1.5 pr-3 text-stone-500">
                {a.predecessors.length > 0 ? a.predecessors.join(', ') : '—'}
              </td>
              <td className="py-1.5 pr-3 text-right text-stone-700">{a.duration}</td>
              {showAnswers ? (
                <>
                  <td className="py-1.5 pr-3 text-right text-stone-700">{a.est}</td>
                  <td className="py-1.5 pr-3 text-right text-stone-700">{a.eft}</td>
                  <td className="py-1.5 pr-3 text-right text-stone-700">{a.lst}</td>
                  <td className="py-1.5 pr-3 text-right text-stone-700">{a.lft}</td>
                  <td className="py-1.5 pr-3 text-right font-medium text-stone-900">
                    {a.slack}
                  </td>
                  <td className="py-1.5">
                    {a.critical && (
                      <span className="rounded-full bg-garnet-100 px-2 py-0.5 text-xs font-medium text-garnet-800">
                        critical
                      </span>
                    )}
                  </td>
                </>
              ) : (
                <>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <td key={i} className="py-1.5 pr-3">
                      <div className="ml-auto h-5 w-12 rounded border border-stone-200 bg-stone-50/50" />
                    </td>
                  ))}
                  <td className="py-1.5" />
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
