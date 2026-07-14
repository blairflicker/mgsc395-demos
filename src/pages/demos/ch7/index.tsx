import { useEffect, useMemo, useState } from 'react'
import DemoHeader from '../../../components/DemoHeader'
import {
  CRASH_OPTIONS,
  ST_JOHNS,
  computeCpm,
  descendantsOf,
  nextActivityId,
  randomProject,
  type ActivityInput,
} from '../../../lib/cpm'
import { Network } from './Network'
import { Gantt } from './Gantt'
import { COLOR_CRITICAL, COLOR_MUTED } from './palette'
import { downloadWorksheet } from './worksheet'

const MIN_DUR = 1
const MAX_DUR = 52

const CLASS_PLAN = computeCpm(ST_JOHNS)

const cloneClass = (): ActivityInput[] =>
  ST_JOHNS.map((a) => ({ ...a, predecessors: [...a.predecessors] }))

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-US')
}

function pathLabel(ids: string[]): string {
  return ['Start', ...ids, 'Finish'].join(' → ')
}

export default function Ch7ProjectManagement() {
  const [activities, setActivities] = useState<ActivityInput[]>(cloneClass)
  const [crashed, setCrashed] = useState<Record<string, boolean>>({})
  const [showAnswers, setShowAnswers] = useState(true)

  useEffect(() => {
    document.title = 'Project Management · MGSC 395'
    return () => {
      document.title = 'MGSC 395 · Interactive Demos'
    }
  }, [])

  /** true when the activity set and precedence structure match the class
   *  project exactly (durations may differ — the crash panel handles that) */
  const isClassStructure = useMemo(() => {
    if (activities.length !== ST_JOHNS.length) return false
    return ST_JOHNS.every((c) => {
      const a = activities.find((x) => x.id === c.id)
      return (
        a !== undefined &&
        [...a.predecessors].sort().join() === [...c.predecessors].sort().join()
      )
    })
  }, [activities])

  /** durations with any active crash pinning its activity to crash time */
  const effective = useMemo(() => {
    if (!isClassStructure) return activities
    return activities.map((a) => {
      const option = CRASH_OPTIONS.find((o) => o.id === a.id && crashed[o.id])
      return option ? { ...a, duration: option.crashTime } : a
    })
  }, [activities, crashed, isClassStructure])

  const schedule = useMemo(() => computeCpm(effective), [effective])
  /** current durations with NO crashes — the before picture for the crash panel */
  const baseline = useMemo(
    () => (isClassStructure ? computeCpm(activities) : null),
    [activities, isClassStructure],
  )
  /** what each crash would do on its own, given the current durations */
  const crashImpacts = useMemo(
    () =>
      isClassStructure
        ? CRASH_OPTIONS.map((option) => ({
            option,
            duration: computeCpm(
              activities.map((a) =>
                a.id === option.id ? { ...a, duration: option.crashTime } : a,
              ),
            ).projectDuration,
          }))
        : [],
    [activities, isClassStructure],
  )

  const durationOf = (id: string) => activities.find((a) => a.id === id)!.duration

  const setDuration = (id: string, value: number) => {
    const v = Math.min(MAX_DUR, Math.max(MIN_DUR, Math.round(value)))
    setActivities((list) => list.map((a) => (a.id === id ? { ...a, duration: v } : a)))
  }

  const togglePredecessor = (id: string, candidate: string) => {
    setActivities((list) =>
      list.map((a) => {
        if (a.id !== id) return a
        const has = a.predecessors.includes(candidate)
        return {
          ...a,
          predecessors: has
            ? a.predecessors.filter((p) => p !== candidate)
            : [...a.predecessors, candidate].sort(),
        }
      }),
    )
  }

  const removeActivity = (id: string) => {
    setActivities((list) =>
      list
        .filter((a) => a.id !== id)
        .map((a) => ({ ...a, predecessors: a.predecessors.filter((p) => p !== id) })),
    )
    setCrashed({})
  }

  const addActivity = () => {
    setActivities((list) => {
      const id = nextActivityId(list)
      if (!id) return list
      return [...list, { id, name: '', predecessors: [], duration: 5 }]
    })
  }

  const backToClass = () => {
    setActivities(cloneClass())
    setCrashed({})
  }

  const makeRandom = () => {
    setActivities(randomProject())
    setCrashed({})
    setShowAnswers(false)
  }

  const isClassPlan =
    isClassStructure &&
    ST_JOHNS.every((c) => effective.find((a) => a.id === c.id)!.duration === c.duration)

  const anyCrash = isClassStructure && CRASH_OPTIONS.some((o) => crashed[o.id])
  const totalCrashSpend = CRASH_OPTIONS.filter((o) => crashed[o.id]).reduce(
    (sum, o) => sum + (o.crashCost - o.normalCost),
    0,
  )
  const weeksSavedNow = baseline
    ? baseline.projectDuration - schedule.projectDuration
    : 0

  const maxPathTime = Math.max(...schedule.paths.map((p) => p.duration))

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DemoHeader
        label="Chapter 7 · Project Management"
        title="The Critical Path, Live"
      >
        The St. John&rsquo;s Hospital project from class — but editable.
        Change estimated times, rewire predecessors, add or remove
        activities, and watch the forward pass, backward pass, slack, and
        the critical path recompute instantly. Or hide the answers, generate
        a random project, and run the two games yourself.
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
          onClick={() => void downloadWorksheet(activities)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Download worksheet (PDF)
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
            Answers hidden — run the forward and backward games yourself (the
            worksheet PDF matches this exact problem), then reveal to check.
          </span>
        )}
      </div>

      {/* Activity editor */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">
              The activities
            </h2>
            <p className="max-w-3xl text-sm text-stone-600">
              Set each activity&rsquo;s estimated time, and click the letter
              chips to choose which activities must finish first (its
              immediate predecessors). No predecessors means it starts right
              at Start.
            </p>
          </div>
          <button
            onClick={addActivity}
            disabled={activities.length >= 26}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
          >
            + Add activity
          </button>
        </div>
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {schedule.activities.map((a) => {
            const pinned =
              isClassStructure &&
              CRASH_OPTIONS.some((o) => o.id === a.id && crashed[o.id])
            const blocked = descendantsOf(activities, a.id)
            return (
              <div key={a.id} className="rounded-lg border border-stone-100 p-2.5">
                <div className="mb-0.5 flex items-baseline justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-baseline gap-1.5">
                    <span
                      className="inline-block h-2 w-2 shrink-0 self-center rounded-full"
                      style={{
                        backgroundColor:
                          showAnswers && a.critical ? COLOR_CRITICAL : 'transparent',
                        border:
                          showAnswers && a.critical
                            ? 'none'
                            : `1.5px solid ${COLOR_MUTED}`,
                      }}
                    />
                    <span className="font-semibold text-stone-800">{a.id}</span>
                    {a.name && (
                      <span className="truncate text-stone-500" title={a.name}>
                        {a.name}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-stone-600 tabular-nums">
                    {pinned ? (
                      <span className="rounded-full bg-garnet-100 px-2 py-0.5 text-xs font-medium text-garnet-800">
                        crashed → {a.duration} wk
                      </span>
                    ) : (
                      `${a.duration} wk`
                    )}
                    <button
                      onClick={() => removeActivity(a.id)}
                      disabled={activities.length <= 1}
                      aria-label={`Remove activity ${a.id}`}
                      title={`Remove activity ${a.id}`}
                      className="h-5 w-5 rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30"
                    >
                      ×
                    </button>
                  </span>
                </div>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <button
                    onClick={() => setDuration(a.id, durationOf(a.id) - 1)}
                    disabled={pinned || durationOf(a.id) <= MIN_DUR}
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
                    value={durationOf(a.id)}
                    disabled={pinned}
                    onChange={(e) => setDuration(a.id, Number(e.target.value))}
                    className="w-full accent-garnet-700 disabled:opacity-40"
                    aria-label={`Estimated time for activity ${a.id}`}
                  />
                  <button
                    onClick={() => setDuration(a.id, durationOf(a.id) + 1)}
                    disabled={pinned || durationOf(a.id) >= MAX_DUR}
                    aria-label={`Increase ${a.id} by one week`}
                    className="h-6 w-6 shrink-0 rounded border border-stone-300 text-sm leading-none text-stone-600 hover:bg-stone-50 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="mr-0.5 text-[10px] text-stone-400 uppercase">
                    after:
                  </span>
                  {activities
                    .filter((other) => other.id !== a.id)
                    .map((other) => {
                      const selected = a.predecessors.includes(other.id)
                      const wouldCycle = !selected && blocked.has(other.id)
                      return (
                        <button
                          key={other.id}
                          onClick={() => togglePredecessor(a.id, other.id)}
                          disabled={wouldCycle}
                          title={
                            wouldCycle
                              ? `${other.id} comes after ${a.id} — picking it would create a cycle`
                              : selected
                                ? `Remove ${other.id} as a predecessor of ${a.id}`
                                : `Make ${other.id} a predecessor of ${a.id}`
                          }
                          className={[
                            'h-5 min-w-5 rounded px-1 text-[11px] font-semibold transition-colors',
                            selected
                              ? 'bg-garnet-800 text-white'
                              : wouldCycle
                                ? 'bg-stone-50 text-stone-300'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200',
                          ].join(' ')}
                        >
                          {other.id}
                        </button>
                      )
                    })}
                  {a.predecessors.length === 0 && (
                    <span className="text-[10px] text-stone-400">
                      (starts at Start)
                    </span>
                  )}
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
        <h2 className="mb-1 text-lg font-semibold text-stone-900">
          The project network
        </h2>
        <p className="mb-3 max-w-3xl text-sm text-stone-600">
          {showAnswers ? (
            <>
              Each node carries the four numbers from class: Earliest Start
              and Earliest Finish across the top, Latest Start and Latest
              Finish across the bottom. The forward game fills in the top row
              (taking the <strong>MAX</strong> of the predecessors&rsquo;
              EFTs); the backward game fills in the bottom row (taking the{' '}
              <strong>MIN</strong> of the successors&rsquo; LSTs). Where the
              two rows agree, slack is zero — that chain of garnet nodes is
              the critical path.
            </>
          ) : (
            <>
              The four corner cells of every node are blank: EST and EFT
              across the top (forward game, Start → Finish), LST and LFT
              across the bottom (backward game, Finish → Start). Treat it
              like sudoku.
            </>
          )}
        </p>
        <Network schedule={schedule} hideAnswers={!showAnswers} />
      </div>

      {showAnswers && (
        <div className="mb-6 grid gap-4 lg:grid-cols-5">
          {/* Paths */}
          <div className="rounded-xl border border-stone-200 bg-white p-5 lg:col-span-2">
            <h2 className="mb-1 text-lg font-semibold text-stone-900">
              Every path from Start to Finish
            </h2>
            <p className="mb-4 text-sm text-stone-600">
              A path&rsquo;s time is the sum of its activities&rsquo; times.
              The slowest path sets the project duration — no schedule can
              beat it, just like a bottleneck sets a process&rsquo;s capacity.
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
            <ScheduleTable schedule={schedule} showAnswers />
          </div>
        </div>
      )}

      {!showAnswers && (
        <div className="mb-6 overflow-x-auto rounded-xl border border-stone-200 bg-white p-5">
          <ScheduleTable schedule={schedule} showAnswers={false} />
        </div>
      )}

      {/* Gantt */}
      {showAnswers && (
        <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="mb-1 text-lg font-semibold text-stone-900">
            Gantt chart — grab a bar and feel the slack
          </h2>
          <p className="mb-3 max-w-3xl text-sm text-stone-600">
            Every bar starts at its Earliest Start Time. Bars with slack can
            be dragged anywhere inside their whisker — early, late, anywhere
            between EST and LFT — without delaying the project. The
            connectors never break: drag a bar into a neighbor and it shoves
            that neighbor along, until the whole chain runs out of slack.
            Critical bars can&rsquo;t move at all; that is what zero slack
            means.
          </p>
          <Gantt schedule={schedule} />
        </div>
      )}

      {/* Crashing — only meaningful on the class project */}
      {showAnswers && isClassStructure && baseline && (
        <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="mb-1 text-lg font-semibold text-stone-900">
            Crashing: paying to finish sooner
          </h2>
          <p className="mb-4 max-w-3xl text-sm text-stone-600">
            Crashing means spending money to shorten an activity. Class
            considered two opportunities. One is expensive and shortens the
            project; the other is cheap and does <em>nothing</em>. Toggle
            each and watch the network above — the only crashes worth buying
            are on the critical path.
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
                  {durationOf(o.id) !== o.normalTime && (
                    <div className="mt-2 text-xs text-amber-700">
                      Your slider has {o.id} at {durationOf(o.id)} wks; the
                      class example crashes it from {o.normalTime}.
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
              . The recipe from class: find the critical-path activity with
              the lowest cost per week, and crash it until it can&rsquo;t be
              shortened, another path becomes critical, or the price stops
              being worth it.
            </div>
          )}
        </div>
      )}

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
              In the Gantt chart, drag F anywhere in its 41-week window —
              early, late, it never matters. Then try to drag H. It
              won&rsquo;t budge: zero slack.
            </li>
            <li>
              Drag C to the right: it immediately shoves G along through the
              connector, and both hit their late limits together — slack is
              shared along a path, not owned by one activity.
            </li>
            <li>
              Add one week to H (Construct hospital, slack 0). The project
              instantly slips to 70 weeks. Now stretch F to 52 and the
              critical path <em>shifts</em> to A–F–K.
            </li>
            <li>
              Rewire the project: make E a predecessor of K instead of J, or
              add a new activity L after G, and see how the network redraws
              and the critical path reacts.
            </li>
            <li>
              Hit &ldquo;Create a random problem&rdquo;, download the
              worksheet, fill in all four corners of every node by hand, then
              &ldquo;Show answers&rdquo; to grade yourself.
            </li>
          </ul>
        </div>
      </div>
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
      <p className="mb-3 text-sm text-stone-600">
        {showAnswers ? (
          <>
            EST/EFT come from the forward game, LST/LFT from the backward
            game, and Slack&nbsp;=&nbsp;LFT&nbsp;−&nbsp;EFT. Zero slack means
            critical: any delay there delays the project.
          </>
        ) : (
          <>
            Your turn: forward game for EST/EFT, backward game for LST/LFT,
            then Slack&nbsp;=&nbsp;LFT&nbsp;−&nbsp;EFT.
          </>
        )}
      </p>
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
