interface DepartureFieldProps {
  value: string
  onChange: (value: string) => void
  error?: string
}

export function DepartureField({ value, onChange, error }: DepartureFieldProps) {
  return (
    <div>
      <label htmlFor="start" className="field-label">
        Departure <span className="font-normal text-muted">(optional)</span>
      </label>
      <input
        id="start"
        type="datetime-local"
        step={900}
        className={`field ${error ? 'border-red-400' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby="start-help"
      />
      <p id="start-help" className={`mt-1.5 text-[13px] ${error ? 'text-red-600' : 'text-muted'}`}>
        {error ?? 'Home-terminal time at the current location. Leave empty to leave now.'}
      </p>
    </div>
  )
}
