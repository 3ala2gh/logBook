import type { LogDetails } from '@/types'
import { SIGNATURE_Y } from '../../constants'
import { FormField, TextLines } from './SvgText'

export function CertificationSection({ details }: { details: LogDetails }) {
  return (
    <g>
      <TextLines x={30} y={SIGNATURE_Y - 10} lines={['I certify that these entries are true and correct.']} size={10.5} />
      <FormField x1={560} x2={970} y={SIGNATURE_Y} caption="Driver's signature in full" value={details.driver_name} />
      <FormField
        x1={30}
        x2={300}
        y={SIGNATURE_Y + 8}
        caption="Name of co-driver"
        captionAnchor="start"
        value={details.co_driver || undefined}
      />
    </g>
  )
}
