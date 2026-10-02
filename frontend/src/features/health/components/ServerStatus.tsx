import type { ServerStatus } from '../hooks/useServerStatus'

const PILL: Record<ServerStatus, { dot: string; text: string }> = {
  checking: { dot: 'bg-accent animate-pulse', text: 'Connecting' },
  waking: { dot: 'bg-accent animate-pulse', text: 'Waking server' },
  ready: { dot: 'bg-duty-d', text: 'Online' },
  down: { dot: 'bg-red-500', text: 'Offline' },
}

export function ServerStatusPill({ status }: { status: ServerStatus }) {
  const { dot, text } = PILL[status]
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
      <span className={`size-2 rounded-full ${dot}`} aria-hidden />
      <span role="status">{text}</span>
    </span>
  )
}

export function ServerWakeBanner({ status }: { status: ServerStatus }) {
  if (status !== 'waking' && status !== 'down') return null
  const waking = status === 'waking'
  return (
    <div
      role="status"
      className={`border-b px-4 py-2.5 text-center text-sm ${
        waking ? 'border-accent/40 bg-accent/15 text-ink' : 'border-red-200 bg-red-50 text-red-800'
      }`}
    >
      {waking ? (
        <>
          <strong className="font-semibold">Waking the server…</strong> The free hosting tier sleeps when idle; the
          first request can take up to a minute. You can fill in the trip meanwhile.
        </>
      ) : (
        <>
          <strong className="font-semibold">The planning server is not responding.</strong> Please refresh the page in a
          minute.
        </>
      )}
    </div>
  )
}
