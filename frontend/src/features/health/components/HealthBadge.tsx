import { useHealth } from '../hooks/useHealth'

const COLORS = {
  loading: 'bg-yellow-400',
  ok: 'bg-green-500',
  error: 'bg-red-500',
} as const

export function HealthBadge() {
  const status = useHealth()

  return (
    <p className="flex items-center gap-2 text-slate-600">
      <span className={'inline-block size-3 rounded-full ' + COLORS[status]} />
      Backend: {status}
    </p>
  )
}
