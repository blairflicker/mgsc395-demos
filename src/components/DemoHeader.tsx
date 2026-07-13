export default function DemoHeader({
  label,
  title,
  children,
}: {
  label: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-6">
      <p className="mb-1 text-xs font-semibold tracking-widest text-garnet-800 uppercase">
        {label}
      </p>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
        {title}
      </h1>
      {children && (
        <div className="max-w-3xl text-sm leading-relaxed text-stone-600">
          {children}
        </div>
      )}
    </div>
  )
}
