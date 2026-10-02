import { Spinner } from '@/components/ui'

export function EmptyMapOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-500 grid place-items-center p-6">
      <div className="max-w-xs rounded-2xl bg-white/90 px-5 py-4 text-center shadow-lg backdrop-blur">
        <p className="font-semibold">Your route will appear here</p>
        <p className="mt-1 text-sm text-muted">
          Enter a trip, or press <span className="font-medium text-ink">Try an example</span> to see a coast-to-coast run.
        </p>
      </div>
    </div>
  )
}

export function LoadingMapOverlay() {
  return (
    <div className="absolute inset-0 z-500 grid place-items-center bg-paper/55 backdrop-blur-[2px]" role="status">
      <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-3.5 shadow-lg">
        <Spinner className="size-5" />
        <span className="text-sm font-medium">Finding a truck route and planning stops…</span>
      </div>
    </div>
  )
}
