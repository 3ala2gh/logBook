import { HealthBadge } from '../features/health'

export default function App() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 text-slate-900">
      <h1 className="text-4xl font-bold">LogBook</h1>
      <HealthBadge />
    </main>
  )
}
