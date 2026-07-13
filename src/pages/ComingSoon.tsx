import { Link, useParams } from 'react-router-dom'
import { chapters } from '../lib/chapters'

export default function ComingSoon() {
  const { slug } = useParams()
  const chapter = chapters.find((c) => c.slug === slug)

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <span className="mb-4 rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-500">
        Coming soon
      </span>
      <h1 className="mb-2 text-2xl font-bold text-stone-900">
        {chapter ? `${chapter.label}: ${chapter.title}` : 'Demo not found'}
      </h1>
      <p className="mb-8 text-stone-600">
        {chapter
          ? 'This demo is under construction. Check back soon!'
          : 'No demo exists at this address.'}
      </p>
      <Link
        to="/"
        className="rounded-lg bg-garnet-800 px-4 py-2 text-sm font-medium text-white hover:bg-garnet-700"
      >
        &larr; Back to all demos
      </Link>
    </div>
  )
}
