interface StatCardProps {
  label: string
  value: string
  detail?: string
}

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className="rounded-xl border border-line bg-white px-3.5 py-3">
      <dt className="text-[12px] font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-mono text-[19px] leading-tight font-semibold text-ink">{value}</dd>
      {detail && <dd className="mt-0.5 text-[12px] text-muted">{detail}</dd>}
    </div>
  )
}
