import type { LogDetails } from '../../../types/api'

const FIELDS: { key: keyof LogDetails; label: string; placeholder: string }[] = [
  { key: 'driver_name', label: 'Driver name', placeholder: 'Alex Driver' },
  { key: 'co_driver', label: 'Co-driver', placeholder: 'None' },
  { key: 'carrier', label: 'Carrier', placeholder: 'Demo Freight Lines' },
  { key: 'main_office', label: 'Main office address', placeholder: 'Dallas, TX' },
  { key: 'home_terminal', label: 'Home terminal address', placeholder: 'Current location' },
  { key: 'truck_number', label: 'Truck / tractor no.', placeholder: 'TRK 101' },
  { key: 'trailer_number', label: 'Trailer no.', placeholder: 'TRL 2048' },
  { key: 'manifest_number', label: 'DVL / manifest no.', placeholder: 'BOL-104233' },
  { key: 'shipper', label: 'Shipper', placeholder: 'Acme Distribution' },
  { key: 'commodity', label: 'Commodity', placeholder: 'General freight' },
]

interface Props {
  value: Partial<LogDetails>
  onChange: (value: Partial<LogDetails>) => void
}

export function LogDetailsFields({ value, onChange }: Props) {
  return (
    <details className="group rounded-xl border border-line bg-paper/50">
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium text-ink-soft select-none">
        <span>
          Log sheet details <span className="font-normal text-muted">(optional)</span>
        </span>
        <span aria-hidden className="text-muted transition group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="grid grid-cols-1 gap-3 px-3.5 pb-3.5 sm:grid-cols-2">
        <p className="text-[13px] text-muted sm:col-span-2">
          Printed in the header of every log sheet. Leave blank to use the placeholders.
        </p>
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label htmlFor={`log-${field.key}`} className="field-label">
              {field.label}
            </label>
            <input
              id={`log-${field.key}`}
              className="field py-2 text-sm"
              placeholder={field.placeholder}
              value={value[field.key] ?? ''}
              onChange={(e) => onChange({ ...value, [field.key]: e.target.value })}
            />
          </div>
        ))}
      </div>
    </details>
  )
}
