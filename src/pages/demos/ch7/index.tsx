import { useEffect, useMemo, useState } from 'react'
import DemoHeader from '../../../components/DemoHeader'
import {
  CRASH_OPTIONS,
  DEFAULT_DURATIONS,
  ST_JOHNS,
  computeCpm,
} from '../../../lib/cpm'
import { Network } from './Network'
import { Gantt } from './Gantt'
import { COLOR_CRITICAL, COLOR_MUTED } from './palette'

const MIN_DUR = 1
const MAX_DUR = 52

const CLASS_PLAN = computeCpm(ST_JOHNS)

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-US')
}

function pathLabel(ids: string[]): string {
  return ['Start', ...ids, 'Finish'].join(' → ')
}

export default function Ch7ProjectManagement() {
  const [durations, setDurations] = useState<Record<string, number>>(
    () => ({ ...DEFAULT_DURATIONS }),
  )
  const [crashed, setCrashed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    document.title = 'Project Management · MGSC 395'
    return () => {
      document.title = 'MGSC 395 · Interactive Demos'
    }
  }, [])

  /** slider values with any active crash pinning its activity to crash time */
  const effective = useMemo(() => {
    const d = { ...durations }
    for (const o of CRASH_OPTIONS) if (crashed[o.id]) d[o.id] = o.crashTime
    return d
  }, [durations, crashed])

  const schedule = useMemo(
    () => computeCpm(ST_JOHNS.map((a) => ({ ...a, duration: effective[a.id] }))),
    [effective],
  )
  /** current sliders with NO crashes — the before picture for the crash panel */
  const baseline = useMemo(
    () => computeCpm(ST_JOHNS.map((a) => ({ ...a, duration: durations[a.id] }))),
    [durations],
  )
  /** what each crash would do on its own, given the current sliders */
  const crashImpacts = useMemo(
    () =>
      CRASH_OPTIONS.map((option) => ({
        option,
        duration: computeCpm(
          ST_JOHNS.map((a) => ({
            ...a,
            duration: a.id === option.id ? option.crashTime : durations[a.id],
          })),
        ).projectDuration,
      })),
    [durations],
  )

  const setDuration = (id: string, value: number) => {
    const v = Math.min(MAX_DUR, Math.max(MIN_DUR, Math.round(value)))
    setDurations((d) => ({ ...d, [id]: v }))
  }

  const reset = () => {
    setDurations({ ...DEFAULT_DURATIONS })
    setCrashed({})
  }

  const isClassPlan =
    ST_JOHNS.every((a) => effective[a.id] === DEFAULT_DURATIONS[a.id])

  const anyCrash = CRASH_OPTIONS.some((o) => crashed[o.id])
  const totalCrashSpend = CRASH_OPTIONS.filter((o) => crashed[o.id]).reduce(
    (sum, o) => sum + (o.crashCost - o.normalCost),
    0,
  )
  const weeksSavedNow = baseline.projectDuration - schedule.projectDuration

  const maxPathTime = Math.max(...schedule.paths.map((p) => p.duration))

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DemoHeader
        label="Chapter 7 · Project Management"
        title="The Critical Path, Live"
      >
        The St. John&rsquo;s Hospital project from class: eleven activities,
        A through K, from selecting the administrative staff to training the
        nurses. Change any activity&rsquo;s estimated time and watch the
        forward pass, backward pass, slack, and the critical path recompute
        instantly. The critical path is the bottleneck — it alone sets the
        finish date, so it should be protected at all costs.
      </DemoHeader>

      {/* Duration controls */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">
              Estimated times (weeks)
            </h2>
            <p className="max-w-3xl text-sm text-stone-600">
              Every activity starts at its class value. Lengthen a{' '}
              <span
                className="mx-0.5 inline-block h-2 w-2 rounded-full align-middle"
                style={{ backgroundColor: COLOR_CRITICAL }}
              />{' '}
              zero-slack activity and the whole hospital slips. Lengthen one
              with slack and nothing happens&hellip; until the slack runs out
              and the critical path <em>shifts</em>.
            </p>
          </div>
          <button
            onClick={reset}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Reset to class values
          </button>
        </div>
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {schedule.activities.map((a) => {
            const pinned = CRASH_OPTIONS.some((o) => o.id === a.id && crashed[o.id])
            return (
              <div key={a.id}>
                <div className="mb-0.5 flex items-baseline justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-baseline gap-1.5">
                    <span
                      className="inline-block h-2 w-2 shrink-0 self-center rounded-full"
                      style={{
                        backgroundColor: a.critical ? COLOR_CRITICAL : 'transparent',
                        border: a.critical ? 'none' : `1.5px solid ${COLOR_MUTED}`,
                      }}
                    />
                    <span className="font-semibold text-stone-800">{a.id}</span>
                    <span className="truncate text-stone-500" title={a.name}>
                      {a.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-stone-600 tabular-nums">
                    {pinned ? (
                      <span className="rounded-full bg-garnet-100 px-2 py-0.5 text-xs font-medium text-garnet-800">
                        crashed → {a.duration} wk
                      </span>
                    ) : (
                      `${a.duration} wk`
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setDuration(a.id, durations[a.id] - 1)}
                    disabled={pinned || durations[a.id] <= MIN_DUR}
                    aria-label={`Decrease ${a.id} by one week`}
                    className="h-6 w-6 shrink-0 rounded border border-stone-300 text-sm leading-none text-stone-600 hover:bg-stone-50 disabled:opacity-40"
                  >
                    −
                  </button>
                  <input
                    type="range"
                    min={MIN_DUR}
                    max={MAX_DUR}
                    step={1}
                    value={durations[a.id]}
                    disabled={pinned}
                    onChange={(e) => setDuration(a.id, Number(e.target.value))}
                    className="w-full accent-garnet-700 disabled:opacity-40"
                    aria-label={`Estimated time for activity ${a.id}`}
                  />
                  <button
                    onClick={() => setDuration(a.id, durations[a.id] + 1)}
                    disabled={pinned || durations[a.id] >= MAX_DUR}
                    aria-label={`Increase ${a.id} by one week`}
                    className="h-6 w-6 shrink-0 rounded border border-stone-300 text-sm leading-none text-stone-600 hover:bg-stone-50 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Headline result */}
      <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
          <div>
            <div className="text-sm font-medium text-stone-600">
              Project duration
            </div>
            <div className="text-4xl font-bold text-stone-900 tabular-nums">
              {schedule.projectDuration}
              <span className="ml-1.5 text-lg font-normal text-stone-500">
                weeks
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-stone-600">
              Critical path{schedule.criticalPaths.length > 1 ? 's' : ''}
            </div>
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
          </div>
        </div>
      </div>

      {/* Network diagram */}
      <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="mb-1 text-lg font-semibold text-stone-900">
          The project network
        </h2>
        <p className="mb-3 max-w-3xl text-sm text-stone-600">
          Each node carries the four numbers from class: Earliest Start and
          Earliest Finish across the top, Latest Start and Latest Finish across
          the bottom. The forward game fills in the top row (taking the{' '}
          <strong>MAX</strong> of the predecessors&rsquo; EFTs); the backward
          game fills in the bottom row (taking the <strong>MIN</strong> of the
          successors&rsquo; LSTs). Where the two rows agree, slack is zero —
          that chain of garnet nodes is the critical path.
        </p>
        <Network schedule={schedule} />
      </div>

      {/* Paths */}
      <div className="mb-6 grid gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-stone-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-1 text-lg font-semibold text-stone-900">
            Every path from Start to Finish
          </h2>
          <p className="mb-4 text-sm text-stone-600">
            A path&rsquo;s time is the sum of its activities&rsquo; times. The
            slowest path sets the project duration — no schedule can beat it,
            just like a bottleneck sets a process&rsquo;s capacity.
          </p>
          <div className="space-y-3">
            {schedule.paths.map((p) => (
              <div key={p.ids.join('-')}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span
                    className={
                      p.critical
                        ? 'font-semibold text-stone-900'
                        : 'text-stone-600'
                    }
                  >
                    {p.ids.join('–')}
                    {p.critical && (
                      <span className="ml-2 rounded-full bg-garnet-100 px-2 py-0.5 text-xs font-medium text-garnet-800">
                        critical
                      </span>
                    )}
                  </span>
                  <span className="font-medium text-stone-700 tabular-nums">
                    {p.duration} wks
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-stone-100">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${(p.duration / maxPathTime) * 100}%`,
                      backgroundColor: p.critical ? COLOR_CRITICAL : COLOR_MUTED,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule table */}
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white p-5 lg:col-span-3">
          <h2 className="mb-1 text-lg font-semibold text-stone-900">
            The full schedule
          </h2>
          <p className="mb-3 text-sm text-stone-600">
            EST/EFT come from the forward game, LST/LFT from the backward game,
            and Slack&nbsp;=&nbsp;LFT&nbsp;−&nbsp;EFT. Zero slack means
            critical: any delay there delays the hospital.
          </p>
          <table className="w-full min-w-105 text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                <th className="py-2 pr-3 font-semibold">Activity</th>
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
                    a.critical ? 'bg-garnet-50/60' : '',
                  ].join(' ')}
                >
                  <td className="max-w-44 py-1.5 pr-3">
                    <span className="font-semibold text-stone-800">{a.id}</span>{' '}
                    <span className="text-stone-500" title={a.name}>
                      {a.name.length > 26 ? a.name.slice(0, 25) + '…' : a.name}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 text-right text-stone-700">{a.duration}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gantt */}
      <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="mb-1 text-lg font-semibold text-stone-900">
          Gantt chart
        </h2>
        <p className="mb-3 max-w-3xl text-sm text-stone-600">
          Every bar starts at its Earliest Start Time and runs for its
          estimated time. The lighter whisker is the activity&rsquo;s slack —
          how far it could slide before it delays the project. Critical
          activities have no whisker at all: they are pinned to the schedule.
        </p>
        <Gantt schedule={schedule} />
      </div>

      {/* Crashing */}
      <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="mb-1 text-lg font-semibold text-stone-900">
          Crashing: paying to finish sooner
        </h2>
        <p className="mb-4 max-w-3xl text-sm text-stone-600">
          Crashing means spending money to shorten an activity. Class
          considered two opportunities. One is expensive and shortens the
          project; the other is cheap and does <em>nothing</em>. Toggle each
          and watch the network above — the only crashes worth buying are on
          the critical path.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {crashImpacts.map(({ option: o, duration: withOnly }) => {
            const a = schedule.byId[o.id]
            const weeksSaved = baseline.projectDuration - withOnly
            const extraCost = o.crashCost - o.normalCost
            const active = !!crashed[o.id]
            return (
              <label
                key={o.id}
                className={[
                  'block cursor-pointer rounded-lg border p-4 transition-colors',
                  active
                    ? 'border-garnet-300 bg-garnet-50/60'
                    : 'border-stone-200 hover:bg-stone-50',
                ].join(' ')}
              >
                <div className="mb-2 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) =>
                      setCrashed((c) => ({ ...c, [o.id]: e.target.checked }))
                    }
                    className="mt-1 h-4 w-4 accent-garnet-700"
                  />
                  <div>
                    <div className="font-semibold text-stone-900">
                      Crash {o.id} — {a.name}
                    </div>
                    <div className="text-xs text-stone-500">
                      {a.critical && !active ? 'on the critical path' : ''}
                      {!a.critical && !active ? 'not on the critical path' : ''}
                      {active ? 'crash applied' : ''}
                    </div>
                  </div>
                </div>
                <div className="mb-2 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md bg-stone-50 px-3 py-2">
                    <div className="text-xs text-stone-500">Normal</div>
                    <div className="font-medium text-stone-800 tabular-nums">
                      {o.normalTime} wks · {fmtMoney(o.normalCost)}
                    </div>
                  </div>
                  <div className="rounded-md bg-stone-50 px-3 py-2">
                    <div className="text-xs text-stone-500">Crash</div>
                    <div className="font-medium text-stone-800 tabular-nums">
                      {o.crashTime} wk{o.crashTime === 1 ? '' : 's'} ·{' '}
                      {fmtMoney(o.crashCost)}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-stone-700 tabular-nums">
                  {fmtMoney(extraCost)} buys:{' '}
                  {weeksSaved > 0 ? (
                    <>
                      project {baseline.projectDuration} → {withOnly} weeks —{' '}
                      <strong>
                        {fmtMoney(extraCost / weeksSaved)} per week saved
                      </strong>
                    </>
                  ) : (
                    <strong>no reduction in project time</strong>
                  )}
                </div>
                {durations[o.id] !== o.normalTime && (
                  <div className="mt-2 text-xs text-amber-700">
                    Your slider has {o.id} at {durations[o.id]} wks; the class
                    example crashes it from {o.normalTime}.
                  </div>
                )}
              </label>
            )
          })}
        </div>
        {anyCrash && (
          <div className="mt-4 rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-700">
            With your crashes applied the project finishes in{' '}
            <strong className="tabular-nums">
              {schedule.projectDuration} weeks
            </strong>{' '}
            ({weeksSavedNow > 0 ? (
              <span className="tabular-nums">{weeksSavedNow} saved</span>
            ) : (
              'none saved'
            )}
            ) for an extra{' '}
            <strong className="tabular-nums">{fmtMoney(totalCrashSpend)}</strong>
            . The recipe from class: find the critical-path activity with the
            lowest cost per week, and crash it until it can&rsquo;t be
            shortened, another path becomes critical, or the price stops being
            worth it.
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-5 text-sm">
          <h2 className="mb-2 font-semibold text-stone-900">
            The formulas from class
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-stone-600">
            <li>
              <strong>Forward game</strong> — set EST&nbsp;=&nbsp;0 for
              activities with no predecessors, then{' '}
              <em>Earliest Finish = Earliest Start + Estimated Time</em>. With
              several predecessors, EST is the <strong>MAX</strong> of their
              EFTs — all of them must finish first.
            </li>
            <li>
              <strong>Backward game</strong> — start at the finish
              (LFT&nbsp;=&nbsp;project duration) and work backward using{' '}
              <em>Latest Finish = Latest Start + Estimated Time</em>. With
              several successors, LFT is the <strong>MIN</strong> of their
              LSTs.
            </li>
            <li>
              <strong>Slack = LFT − EFT</strong> (equivalently LST − EST): the
              wiggle room between the do-everything-ASAP plan and the
              last-possible-second plan.
            </li>
            <li>
              <strong>Critical path</strong> — the zero-slack chain. Treat it
              like a bottleneck: it determines the overall finish, so protect
              it at all costs.
            </li>
          </ul>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-5 text-sm">
          <h2 className="mb-2 font-semibold text-stone-900">Try this</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-stone-600">
            <li>
              Add one week to H (Construct hospital, slack 0). The project
              instantly slips to 70 weeks — that is what zero slack means.
            </li>
            <li>
              Now stretch F (Interview applicants, slack 41). Nothing
              happens&hellip; for a very long time. At 51 weeks its path ties
              the critical path — two critical paths at once. At 52, the
              critical path <em>shifts</em> to A–F–K and F runs the project.
            </li>
            <li>
              C has only 2 weeks of slack. Nudge it from 10 to 12 and
              A–C–G–J–K ties as a second critical path; at 13 it takes over.
            </li>
            <li>
              Toggle Crash F: $1,000 buys nothing, because F is nowhere near
              the critical path. Toggle Crash D instead: $100,000 buys 2 weeks
              — and notice A–C–G–J–K becomes critical too, so the next week of
              savings would cost even more.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
