import { Link } from 'react-router-dom'
import { chapters, examBlocks, type Chapter } from '../lib/chapters'

function ChapterCard({ chapter }: { chapter: Chapter }) {
  const available = chapter.status === 'available'

  const card = (
    <div
      className={[
        'flex h-full flex-col rounded-xl border bg-white p-5 transition',
        available
          ? 'border-stone-200 shadow-sm hover:-translate-y-0.5 hover:border-garnet-300 hover:shadow-md'
          : 'border-dashed border-stone-300 opacity-70',
      ].join(' ')}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-garnet-800 uppercase">
          {chapter.label}
        </span>
        {available ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            Live
          </span>
        ) : (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
            Coming soon
          </span>
        )}
      </div>
      <h3 className="mb-1 text-lg font-semibold text-stone-900">
        {chapter.title}
      </h3>
      <p className="flex-1 text-sm leading-relaxed text-stone-600">
        {chapter.description}
      </p>
      {available && (
        <span className="mt-3 text-sm font-medium text-garnet-700">
          Launch demo &rarr;
        </span>
      )}
    </div>
  )

  return available ? (
    <Link to={`/${chapter.slug}`} className="block h-full">
      {card}
    </Link>
  ) : (
    card
  )
}

export default function Launcher() {
  const liveCount = chapters.filter((c) => c.status === 'available').length

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-garnet-900/20 bg-garnet-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="mb-2 text-sm font-semibold tracking-widest text-garnet-300 uppercase">
            Interactive Demo Portal
          </p>
          <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Operations Management, Hands-On
          </h1>
          <p className="max-w-2xl text-garnet-100">
            One interactive demonstration for every chapter of MGSC 395. Change
            the inputs, watch the math respond, and build intuition for the
            quantitative tools of operations management.
          </p>
          <p className="mt-4 text-sm text-garnet-300">
            {liveCount} of {chapters.length} demos live
          </p>
        </div>
      </section>

      {/* Chapter grid, grouped by exam */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {examBlocks.map(({ exam, title }) => (
          <div key={exam} className="mb-10 last:mb-0">
            <h2 className="mb-4 flex items-center gap-3 text-sm font-semibold tracking-widest text-stone-500 uppercase">
              {title}
              <span className="h-px flex-1 bg-stone-200" />
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {chapters
                .filter((c) => c.exam === exam)
                .map((c) => (
                  <ChapterCard key={c.slug} chapter={c} />
                ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
