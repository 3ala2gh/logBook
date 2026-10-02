import { Collapsible } from '@/components/ui'
import type { LogDetails } from '@/types'
import { LOG_DETAIL_FIELDS } from '../constants'

interface LogDetailsFieldsProps {
  value: Partial<LogDetails>
  onChange: (value: Partial<LogDetails>) => void
}

export function LogDetailsFields({ value, onChange }: LogDetailsFieldsProps) {
  return (
    <Collapsible
      className="rounded-xl border border-line bg-paper/50"
      summaryClassName="rounded-xl px-3.5 py-3 text-sm font-medium text-ink-soft"
      title={
        <>
          Log sheet details <span className="font-normal text-muted">(optional)</span>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 px-3.5 pb-3.5 sm:grid-cols-2">
        <p className="text-[13px] text-muted sm:col-span-2">
          Printed in the header of every log sheet. Leave blank to use the placeholders.
        </p>
        {LOG_DETAIL_FIELDS.map((field) => (
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
    </Collapsible>
  )
}
