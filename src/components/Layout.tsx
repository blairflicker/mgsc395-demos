import { Link, useLocation } from 'react-router-dom'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="group flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-garnet-950">
              MGSC 395
            </span>
            <span className="hidden text-sm text-stone-500 group-hover:text-stone-700 sm:inline">
              Operations Management
            </span>
          </Link>
          {!isHome && (
            <Link
              to="/"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-garnet-800 hover:bg-garnet-50"
            >
              &larr; All demos
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-stone-400 sm:px-6">
          MGSC 395 · Operations Management · Darla Moore School of Business
        </div>
      </footer>
    </div>
  )
}
