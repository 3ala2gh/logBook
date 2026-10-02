/** Placeholder for the summary and timeline while the first plan loads. */
export function ResultsSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="card space-y-3 p-5">
        <div className="skeleton h-5 w-32" />
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-18 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="card space-y-3 p-5">
        <div className="skeleton h-5 w-28" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex gap-3">
            <div className="skeleton size-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
