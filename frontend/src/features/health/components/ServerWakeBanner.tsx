import type { ServerStatus } from '../types'

export function ServerWakeBanner({ status }: { status: ServerStatus }) {
  if (status === 'waking') {
    return (
      <div role="status" className="border-b border-accent/40 bg-accent/15 px-4 py-2.5 text-center text-sm text-ink">
        <strong className="font-semibold">Waking the server…</strong> The free hosting tier sleeps when idle; the first
        request can take up to a minute. You can fill in the trip meanwhile.
      </div>
    )
  }
  if (status === 'down') {
    return (
      <div role="status" className="border-b border-red-200 bg-red-50 px-4 py-2.5 text-center text-sm text-red-800">
        <strong className="font-semibold">The planning server is not responding.</strong> Please refresh the page in a
        minute.
      </div>
    )
  }
  return null
}
