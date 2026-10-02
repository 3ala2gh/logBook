import type { ServerStatus } from '../types'

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
